import moment from "moment";
import connection from "../config/connectDB.js";
import axios from "axios";
import _ from "lodash";


const getLevel = async () => {
  const today = new Date();

  // Format to match YYYY-DD-MM because that's how your VARCHAR is stored
  const todayDateStr = today.getFullYear() + '-' +
  String(today.getDate()).padStart(2, '0') + '-' +
  String(today.getMonth() + 1).padStart(2, '0');


  console.log(`📆 Today: ${todayDateStr}`);

  // ✅ Fetch salary levels
  const [rawSalaryChart] = await connection.query(`SELECT * FROM salary_level ORDER BY id ASC`);
  const salaryChart = rawSalaryChart.map(row => ({
    level: row.id,
    title: row.title,
    required: row.team,
    deposit: parseFloat(row.daily_deposite),
    salary: parseFloat(row.salary),
  }));

  console.log("📊 Loaded Salary Chart:");
  console.log(salaryChart);

  // ✅ Fetch users
  const [users] = await connection.query(`SELECT phone FROM users`);
  console.log(`👥 Total Users: ${users.length}`);

  for (let user of users) {
    const phone = user.phone;
    console.log(`\n📲 Processing user: ${phone}`);

    const allLevels = await getDownlineByLevel([phone]);

    for (let level = 1; level <= 15; level++) {
      const levelInfo = salaryChart.find(item => item.level === level);
      if (!levelInfo) {
        console.log(`⚠️ Salary chart missing for level ${level}`);
        continue;
      }

      const downlinePhones = allLevels[level] || [];

      console.log(`➡️ Level ${level} (${levelInfo.title}) | Downlines: ${downlinePhones.length} / Required: ${levelInfo.required}`);

      if (downlinePhones.length < levelInfo.required) {
        console.log(`❌ Not enough downlines for level ${level}`);
        continue;
      }

      // ✅ Check total recharge
      const [rechargeSumRows] = await connection.query(
        `
          SELECT SUM(money) AS total
          FROM recharge
          WHERE status = 1
          AND phone IN (${downlinePhones.map(() => '?').join(',')})
          AND LEFT(today, 10) = ?
        `,
        [...downlinePhones, todayDateStr]
      );

      const totalRecharge = rechargeSumRows[0].total || 0;
      console.log(`💰 Total Recharge: ₹${totalRecharge} / Required: ₹${levelInfo.deposit}`);

      if (totalRecharge < levelInfo.deposit) {
        console.log(`❌ Recharge not enough for level ${level}`);
        continue;
      }

      // ✅ Check for existing payout
      const [exists] = await connection.query(
        `SELECT id FROM payouts WHERE user_phone = ? AND level = ? AND DATE(created_at) = CURDATE()`,
        [phone, level]
      );

      if (exists.length) {
        console.log(`⚠️ Payout already exists for ${phone} at level ${level}`);
        continue;
      }

      // ✅ Credit income
      const [updateResult] = await connection.query(
        `UPDATE users SET money = money + ? WHERE phone = ?`,
        [levelInfo.salary, phone]
      );

      console.log(`✅ Credited ₹${levelInfo.salary} to ${phone} (Level ${level})`);

      // ✅ Insert into payouts
      await connection.query(
        `INSERT INTO payouts (user_phone, level, income, income_type, created_at)
         VALUES (?, ?, ?, ?, NOW())`,
        [phone, level, levelInfo.salary, 'salary']
      );

      console.log(`📝 Payout recorded for ${phone} | Level ${level} | ₹${levelInfo.salary}`);
    }
  }

  console.log('\n✅ Salary distribution complete');
  return '✅ Daily salary distribution done (downline logic)';
};


const getDownlineByLevel = async (phones, level = 1, limit = 10, allLevels = {}) => {
  if (level > limit || phones.length === 0) return allLevels;

  // Get all codes of current phones
  const [codesRows] = await connection.query(
    `SELECT code FROM users WHERE phone IN (${phones.map(() => '?').join(',')})`,
    phones
  );
  const codes = codesRows.map(row => row.code);
  if (!codes.length) return allLevels;

  // Get next level phones (those who used any of these codes as invite)
  const [nextUsers] = await connection.query(
    `SELECT phone FROM users WHERE invite IN (${codes.map(() => '?').join(',')})`,
    codes
  );
  const nextPhones = nextUsers.map(row => row.phone);

  allLevels[level] = nextPhones;

  return await getDownlineByLevel(nextPhones, level + 1, limit, allLevels);
};


const levelIncomeController = {
  getLevel,
  //debugOneUse,
};

export default levelIncomeController;