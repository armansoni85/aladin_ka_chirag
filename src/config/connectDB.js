import mysql from "mysql2/promise";

const connection = mysql.createPool({
  host: "localhost",
  user: "qlqgbxef_user",
  password: "TLz(Dt457-Yu",
  database: "qlqgbxef_db",
});

export default connection;
