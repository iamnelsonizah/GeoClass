import time
import uuid
import logging
import threading
from enum import Enum
from typing import Dict, Any, Optional, Callable, List
from concurrent.futures import ThreadPoolExecutor

logger = logging.getLogger(__name__)

class JobStatus(str, Enum):
    PENDING = "pending"
    RUNNING = "running"
    COMPLETED = "completed"
    FAILED = "failed"
    CANCELLED = "cancelled"

class Job:
    def __init__(self, job_id: str, task_type: str, params: Dict[str, Any]):
        self.job_id = job_id
        self.task_type = task_type
        self.params = params
        self.status = JobStatus.PENDING
        self.progress: float = 0.0
        self.message: str = "Job queued for processing."
        self.created_at: float = time.time()
        self.started_at: Optional[float] = None
        self.completed_at: Optional[float] = None
        self.result: Optional[Any] = None
        self.error: Optional[str] = None

    def to_dict(self) -> Dict[str, Any]:
        elapsed = (self.completed_at or time.time()) - (self.started_at or self.created_at)
        return {
            "job_id": self.job_id,
            "task_type": self.task_type,
            "status": self.status.value,
            "progress": round(self.progress, 1),
            "message": self.message,
            "created_at": self.created_at,
            "started_at": self.started_at,
            "completed_at": self.completed_at,
            "elapsed_seconds": round(elapsed, 2),
            "result": self.result,
            "error": self.error
        }

class JobManager:
    """
    Thread-safe asynchronous job execution manager for long-running Earth Engine operations.
    Prevents 504 Gateway Timeouts by executing heavy tasks in the background
    and providing status polling endpoints.
    """
    def __init__(self, max_workers: int = 4):
        self._jobs: Dict[str, Job] = {}
        self._lock = threading.Lock()
        self._executor = ThreadPoolExecutor(max_workers=max_workers, thread_name_prefix="gee-job-worker")

    def create_job(self, task_type: str, params: Dict[str, Any]) -> Job:
        job_id = str(uuid.uuid4())
        job = Job(job_id=job_id, task_type=task_type, params=params)
        with self._lock:
            # Maintain max 200 recent jobs in memory
            if len(self._jobs) > 200:
                oldest_key = min(self._jobs.keys(), key=lambda k: self._jobs[k].created_at)
                del self._jobs[oldest_key]
            self._jobs[job_id] = job
        return job

    def get_job(self, job_id: str) -> Optional[Job]:
        with self._lock:
            return self._jobs.get(job_id)

    def list_jobs(self, limit: int = 25) -> List[Dict[str, Any]]:
        with self._lock:
            sorted_jobs = sorted(self._jobs.values(), key=lambda j: j.created_at, reverse=True)
            return [j.to_dict() for j in sorted_jobs[:limit]]

    def update_job(
        self,
        job_id: str,
        status: Optional[JobStatus] = None,
        progress: Optional[float] = None,
        message: Optional[str] = None,
        result: Optional[Any] = None,
        error: Optional[str] = None
    ):
        with self._lock:
            job = self._jobs.get(job_id)
            if not job:
                return
            if status is not None:
                job.status = status
                if status == JobStatus.RUNNING and job.started_at is None:
                    job.started_at = time.time()
                elif status in (JobStatus.COMPLETED, JobStatus.FAILED, JobStatus.CANCELLED):
                    job.completed_at = time.time()
            if progress is not None:
                job.progress = progress
            if message is not None:
                job.message = message
            if result is not None:
                job.result = result
            if error is not None:
                job.error = error

    def submit_task(self, task_type: str, params: Dict[str, Any], target_func: Callable[..., Any], *args, **kwargs) -> str:
        job = self.create_job(task_type, params)
        job_id = job.job_id

        def worker():
            try:
                self.update_job(job_id, status=JobStatus.RUNNING, progress=10.0, message="Executing Earth Engine computation...")
                res = target_func(*args, **kwargs)
                self.update_job(
                    job_id,
                    status=JobStatus.COMPLETED,
                    progress=100.0,
                    message="Computation completed successfully.",
                    result=res
                )
            except Exception as e:
                logger.error(f"Async job {job_id} ({task_type}) failed: {e}", exc_info=True)
                self.update_job(
                    job_id,
                    status=JobStatus.FAILED,
                    progress=100.0,
                    message=f"Task failed: {str(e)}",
                    error=str(e)
                )

        self._executor.submit(worker)
        return job_id

# Singleton instance
job_manager = JobManager(max_workers=4)
