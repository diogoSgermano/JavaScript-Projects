import mysql from "mysql2";

const db = mysql.createConnection({
  host: "localhost",
  user: "diogoGer26",
  password: "26Diogo1024.",
  database: "achoupet",
});

db.connect(function (err) {
  if (err) throw err;
  console.log("Conectado ao banco de dados MySQL!");
});




export default db;
