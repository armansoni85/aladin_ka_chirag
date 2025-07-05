import "dotenv/config";
import connection from "../src/config/connectDB.js";

const createGameTable = async () => {
  try {
    const db = await connection;

    await db.execute(`
        CREATE TABLE trx_wingo_game (
            id SERIAL PRIMARY KEY NOT NULL,
            phone VARCHAR(20) NOT NULL,
            sessionNo VARCHAR(20) NOT NULL,
            sessionNo VARCHAR(20) NOT NULL,
            time VARCHAR(30) NOT NULL
        );
    `);

    console.log("Created trx_wingo_game table successfully!");
  } catch (error) {
    console.log("Failed to create trx_wingo_game table!");
    console.log(error);
  }
};
createTrxHashGameTable();
