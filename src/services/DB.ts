import { Pool } from "pg";

const db = new Pool({
  host: process.env.DB_HOST,
  port: 5432,
  database: process.env.DB_NAME,
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
});

export class DB {
  static async saveToken(token: string) {
    // Check is it already exists
    const { rows: alreadySavedRows } = await db.query(
      `SELECT * FROM user_devices WHERE token = $1`,
      [token]
    );

    if (alreadySavedRows.length > 0) {
      return [];
    }

    const query = `INSERT INTO user_devices (token) VALUES ($1) RETURNING *`;
    const values = [token];
    const { rows } = await db.query<UserDeviceItem>(query, values);
    return rows[0];
  }

  static async getTokens() {
    const query = `SELECT * FROM user_devices`;
    const { rows } = await db.query<UserDeviceItem>(query);
    return rows;
  }
}

type UserDeviceItem = {
  user_device_id: number;
  token: string;
};
