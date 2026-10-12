import { NextRequest, NextResponse } from 'next/server';
import { query } from '@/lib/db';

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const userId = searchParams.get('userId');

    let sql = `
      SELECT id, user_id, name, description, aoi_geojson, layer_state, created_at, updated_at
      FROM user_workspaces
    `;
    const params: any[] = [];

    if (userId && userId !== 'guest') {
      sql += ` WHERE user_id = $1`;
      params.push(userId);
    }
    sql += ` ORDER BY updated_at DESC LIMIT 30`;

    const res = await query(sql, params);
    return NextResponse.json({ success: true, workspaces: res.rows });
  } catch (err: any) {
    console.error('Failed to fetch workspaces:', err);
    return NextResponse.json(
      { success: false, message: err.message || 'Failed to fetch workspaces.' },
      { status: 500 }
    );
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { id, userId, name, description, aoi_geojson, layer_state } = body;

    if (!name || !name.trim()) {
      return NextResponse.json(
        { success: false, message: 'Workspace name is required.' },
        { status: 400 }
      );
    }

    const validUserId = userId && userId !== 'guest' ? userId : null;

    if (id) {
      // Check if existing
      const existing = await query('SELECT id FROM user_workspaces WHERE id = $1', [id]);
      if (existing.rows.length > 0) {
        const updateRes = await query(
          `UPDATE user_workspaces
           SET name = $1, description = $2, aoi_geojson = $3, layer_state = $4, updated_at = NOW()
           WHERE id = $5
           RETURNING id, user_id, name, description, aoi_geojson, layer_state, created_at, updated_at`,
          [name.trim(), description || null, aoi_geojson || null, layer_state || null, id]
        );
        return NextResponse.json({ success: true, workspace: updateRes.rows[0] });
      }
    }

    // Insert new workspace
    const insertRes = await query(
      `INSERT INTO user_workspaces (name, description, user_id, aoi_geojson, layer_state, created_at, updated_at)
       VALUES ($1, $2, $3, $4, $5, NOW(), NOW())
       RETURNING id, user_id, name, description, aoi_geojson, layer_state, created_at, updated_at`,
      [name.trim(), description || null, validUserId, aoi_geojson || null, layer_state || null]
    );

    return NextResponse.json({ success: true, workspace: insertRes.rows[0] });
  } catch (err: any) {
    console.error('Failed to save workspace:', err);
    return NextResponse.json(
      { success: false, message: err.message || 'Failed to save workspace.' },
      { status: 500 }
    );
  }
}

export async function DELETE(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const id = searchParams.get('id');

    if (!id) {
      return NextResponse.json(
        { success: false, message: 'Workspace ID is required.' },
        { status: 400 }
      );
    }

    await query('DELETE FROM user_workspaces WHERE id = $1', [id]);
    return NextResponse.json({ success: true });
  } catch (err: any) {
    console.error('Failed to delete workspace:', err);
    return NextResponse.json(
      { success: false, message: err.message || 'Failed to delete workspace.' },
      { status: 500 }
    );
  }
}
