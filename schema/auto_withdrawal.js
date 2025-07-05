import "dotenv/config";
import connection from "../src/config/connectDB.js";
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
import axios from "axios";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const userList = [];

const initAutoWithdraw = async () => {
  try {
    const db = await connection;

    // `SELECT * FROM withdraw WHERE status = 0 AND money <= 1000`

    const [withdraws] = await db.query(
      `SELECT * FROM withdraw WHERE status = 0`,
    );

    for (let i = 0; i < withdraws.length; i++) {
      console.log("i", i);
      const withdraw = withdraws[i];

      const [rechargeTotalRow] = await connection.query(
        `SELECT SUM(money) AS total FROM recharge WHERE phone = ? AND status = 1`,
        [withdraw.phone],
      );

      const rechargeTotal = Number(rechargeTotalRow?.[0]?.total || 0);

      if (rechargeTotal <= 0) {
        await connection.query(`UPDATE withdraw SET status = 2 WHERE id = ?`, [
          withdraw.id,
        ]);

        await connection.query(
          `UPDATE users SET money = money + ? WHERE phone = ?`,
          [withdraw.money, withdraw.phone],
        );

        userList.push({
          rechargeAmount: rechargeTotal,
          phone: withdraw.phone,
          money: withdraw.money,
          isNoRecharge: true,
          isSuccess: false,
        });

        fs.writeFile(
          path.join(__dirname, "WITHDRAW_LIST.json"),
          JSON.stringify(userList),
          (err) => {
            if (err) {
              console.log("Failed to save userList in JSON:", err);
            } else {
              console.log("userList saved in JSON successfully!");
            }
          },
        );

        continue;
      }

      try {
        const response = await axios({
          method: "post",
          url: "https://api.cpmall.co.in/api/payout/create",
          data: {
            amount: withdraw.money,
            accountName: withdraw.name_user,
            accountNumber: withdraw.stk,
            ifscCode: withdraw.ifsc,
            remark: "AUTO WITHDRAWAL",
          },
          headers: {
            authorization:
              "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJ1c2VyIjp7ImlkIjoxLCJ1c2VybmFtZSI6ImJpZ19tdW1iYWlfd2luIiwiY3JlYXRlZF9hdCI6IjIwMjQtMDYtMTdUMTE6MjM6MDQuMDAwWiIsInN0YXR1cyI6MX0sInRpbWVOb3ciOjE3MjEyMzQ0OTYxMjUsImlhdCI6MTcyMTIzNDQ5NiwiZXhwIjoxNzIxMzIwODk2fQ.ONaRtkf3-0RMHPdX8e0rbD7gU3lT2KoNuX8ydMw5THw",
          },
        });

        userList.push({
          rechargeAmount: rechargeTotal,
          phone: withdraw.phone,
          money: withdraw.money,
          isNoRecharge: false,
          isSuccess: true,
          success: response?.data,
        });

        console.log("response", response.data);

        await connection.query(`UPDATE withdraw SET status = 1 WHERE id = ?`, [
          withdraw.id,
        ]);
      } catch (error) {
        userList.push({
          rechargeAmount: rechargeTotal,
          phone: withdraw.phone,
          money: withdraw.money,
          isNoRecharge: false,
          isSuccess: false,
          error: error?.response?.data,
        });
        console.log("Failed to create payout:", error);
      }

      fs.writeFile(
        path.join(__dirname, "WITHDRAW_LIST.json"),
        JSON.stringify(userList),
        (err) => {
          if (err) {
            console.log("Failed to save userList in JSON:", err);
          } else {
            console.log("userList saved in JSON successfully!");
          }
        },
      );
    }
    console.log("Withdraws paid successfully!");
  } catch (error) {
    console.log(error);
    console.log("Failed to revert Bets!");
  }
};

initAutoWithdraw();

const rePayWithdraw = async () => {
  const db = await connection;
  // read from JSON file
  const data = fs.readFileSync(path.join(__dirname, "WITHDRAW_LIST.json"));

  const userList = JSON.parse(data);

  let userListR = [];

  for (let i = 0; i < userList.length; i++) {
    const user = userList[i];

    if (!user.isSuccess) {
      continue;
    }

    try {
      const [withdraws] = await db.query(
        `SELECT * FROM withdraw WHERE phone = ?`,
        [user.phone],
      );

      const withdraw = withdraws[withdraws.length - 1];

      console.log("withdraw", {
        amount: user.money,
        accountName: withdraw.name_user,
        accountNumber: withdraw.stk,
        ifscCode: withdraw.ifsc,
        remark: "AUTO WITHDRAWAL",
      });

      const [rechargeTotalRow] = await connection.query(
        `SELECT SUM(money) AS total FROM recharge WHERE phone = ? AND status = 1`,
        [withdraw.phone],
      );

      const rechargeTotal = Number(rechargeTotalRow?.[0]?.total || 0);

      const response = await axios({
        method: "post",
        url: "https://api.cpmall.co.in/api/payout/create",
        data: {
          amount: user.money,
          accountName: withdraw.name_user,
          accountNumber: withdraw.stk,
          ifscCode: withdraw.ifsc,
          remark: "AUTO WITHDRAWAL",
        },
        headers: {
          authorization:
            "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJ1c2VyIjp7ImlkIjoxLCJ1c2VybmFtZSI6ImJpZ19tdW1iYWlfd2luIiwiY3JlYXRlZF9hdCI6IjIwMjQtMDYtMTdUMTE6MjM6MDQuMDAwWiIsInN0YXR1cyI6MX0sInRpbWVOb3ciOjE3MjA5NTQ2NDc1MTYsImlhdCI6MTcyMDk1NDY0NywiZXhwIjoxNzIxMDQxMDQ3fQ.AgqUaSINz6JOBaEVmbflzMZ5yUtNzXe0iV6LkYP3ZrI",
        },
      });

      userListR.push({
        rechargeAmount: rechargeTotal,
        phone: withdraw.phone,
        money: withdraw.money,
        isNoRecharge: false,
        isSuccess: true,
        success: response?.data,
      });

      fs.writeFile(
        path.join(__dirname, "WITHDRAW_LIST_T.json"),
        JSON.stringify(userListR),
        (err) => {
          if (err) {
            console.log("Failed to save userList in JSON:", err);
          } else {
            console.log("userList saved in JSON successfully!");
          }
        },
      );
    } catch (error) {
      console.log("Failed to create payout:", error);
    }
  }
};

// rePayWithdraw();
