import "dotenv/config";
import connection from "../src/config/connectDB.js";
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
import axios from "axios";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const userList = [
  "8100878",
  "9131681",
  "3495520",
  "7298764",
  "0746633",
  "0790275",
  "5953943",
  "0444140",
  "3408125",
  "0370134",
  "6517547",
  "3028140",
  "5089331",
  "5555396",
  "8968908",
  "9265667",
  "3201874",
  "2685916",
  "2950063",
  "1693403",
  "6137527",
  "1807270",
  "4581513",
  "9768899",
  "7934524",
  "1961106",
  "4344830",
  "0065879",
  "4513413",
  "3558923",
  "8172142",
  "9955697",
  "6185158",
  "5500369",
  "3499919",
  "7872951",
  "0420866",
  "4741919",
  "1775636",
];

let amount = [
  10000, 210, 1500, 500, 0, 2055, 1500, 0, 450, 500, 2000, 500, 220, 2000, 600,
  1110, 250, 12000, 300, 4500, 11000, 1641, 1456, 201, 2002, 0, 300, 302, 1608,
  6422, 3000, 1200, 0, 250, 500, 1000, 210, 500, 1500,
];

let ul = [];

const revertClaimedDailyBonusByTime = async () => {
  try {
    const db = await connection;

    // let withdrawsT = 0;
    // let withdrawsL = [];
    for (let i = 0; i < userList.length; i++) {
      const uid = userList[i];
      const [users] = await db.query(`SELECT * FROM users WHERE id_user = ?`, [
        uid,
      ]);
      if (!users.length) {
        console.log("User not found!");
        continue;
      }
      const user = users?.[0];
      const [withdraws] = await db.query(
        `SELECT * FROM withdraw WHERE status = 0 AND phone = ?`,
        [user.phone],
      );
      if (withdraws.length === 0) {
        ul.push({
          uid,
          phone: user.phone,
          noWithdraw: true,
        });

        fs.writeFile(
          path.join(__dirname, "WITHDRAW_LIST_REPORT.json"),
          JSON.stringify(ul),
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

      const [withdrawsSum] = await db.query(
        `SELECT SUM(money) as sum FROM withdraw WHERE status = 0 AND phone = ?`,
        [user.phone],
      );

      const withdraw = withdraws?.[0];

      const withdrawsSumAmount = Number(withdrawsSum[0].sum || 0);

      try {
        const response = await axios({
          method: "post",
          url: "https://api.cpmall.co.in/api/payout/create",
          data: {
            amount: withdrawsSumAmount,
            accountName: withdraw.name_user,
            accountNumber: withdraw.stk,
            ifscCode: withdraw.ifsc,
            remark: "AUTO WITHDRAWAL",
          },
          headers: {
            authorization:
              "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJ1c2VyIjp7ImlkIjoxLCJ1c2VybmFtZSI6ImJpZ19tdW1iYWlfd2luIiwiY3JlYXRlZF9hdCI6IjIwMjQtMDYtMTdUMTE6MjM6MDQuMDAwWiIsInN0YXR1cyI6MX0sInRpbWVOb3ciOjE3MjAyNjA2MzE4MjUsImlhdCI6MTcyMDI2MDYzMSwiZXhwIjoxNzIwMzQ3MDMxfQ.4LdJiwo8GXnfkfEJsfeAaMfYcH6pLdoqqe-j7r2aDws",
          },
        });

        ul.push({
          uid,
          phone: withdraw.phone,
          amount: withdrawsSumAmount,
          accountName: withdraw.name_user,
          accountNumber: withdraw.stk,
          ifscCode: withdraw.ifsc,
          isSuccess: true,
          success: response?.data,
          noWithdraw: false,
        });

        console.log("response", response.data);

        await connection.query(
          `UPDATE withdraw SET status = 1 WHERE phone = ? AND status = 0`,
          [withdraw.phone],
        );
      } catch (error) {
        ul.push({
          uid,
          phone: withdraw.phone,
          amount: withdrawsSumAmount,
          accountName: withdraw.name_user,
          accountNumber: withdraw.stk,
          ifscCode: withdraw.ifsc,
          isSuccess: true,
          error: error?.response?.data,
          noWithdraw: false,
        });
        console.log("Failed to create payout:", error);
      }

      fs.writeFile(
        path.join(__dirname, "WITHDRAW_LIST_REPORT.json"),
        JSON.stringify(ul),
        (err) => {
          if (err) {
            console.log("Failed to save userList in JSON:", err);
          } else {
            console.log("userList saved in JSON successfully!");
          }
        },
      );

      //   const [withdrawsList] = await db.query(
      //     `SELECT * as sum FROM withdraw WHERE status = 0 AND phone = ?`,
      //     [user.phone],
      //   );
      // withdrawsT += Number(withdraws[0].sum || 0);
      // withdrawsL.push(withdraws[0].sum || 0);
      //  withdrawsL.push({
      //    user: userList[i],
      //    amount: amount[i],
      //  });
    }

    console.log("Revert Bets successfully!");
  } catch (error) {
    console.log(error);
    console.log("Failed to revert Bets!");
  }
};

revertClaimedDailyBonusByTime();

const s = [
  { user: "8100878", amount: 10000 },
  { user: "9131681", amount: 210 },
  { user: "3495520", amount: 1500 },
  { user: "7298764", amount: 500 },
  { user: "0746633", amount: 0 },
  { user: "0790275", amount: 2055 },
  { user: "5953943", amount: 1500 },
  { user: "0444140", amount: 0 },
  { user: "3408125", amount: 450 },
  { user: "0370134", amount: 500 },
  { user: "6517547", amount: 2000 },
  { user: "3028140", amount: 500 },
  { user: "5089331", amount: 220 },
  { user: "5555396", amount: 2000 },
  { user: "8968908", amount: 600 },
  { user: "9265667", amount: 1110 },
  { user: "3201874", amount: 250 },
  { user: "2685916", amount: 12000 },
  { user: "2950063", amount: 300 },
  { user: "1693403", amount: 4500 },
  { user: "6137527", amount: 11000 },
  { user: "1807270", amount: 1641 },
  { user: "4581513", amount: 1456 },
  { user: "9768899", amount: 201 },
  { user: "7934524", amount: 2002 },
  { user: "1961106", amount: 0 },
  { user: "4344830", amount: 300 },
  { user: "0065879", amount: 302 },
  { user: "4513413", amount: 1608 },
  { user: "3558923", amount: 6422 },
  { user: "8172142", amount: 3000 },
  { user: "9955697", amount: 1200 },
  { user: "6185158", amount: 0 },
  { user: "5500369", amount: 250 },
  { user: "3499919", amount: 500 },
  { user: "7872951", amount: 1000 },
  { user: "0420866", amount: 210 },
  { user: "4741919", amount: 500 },
  { user: "1775636", amount: 1500 },
];
