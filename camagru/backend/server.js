const express = require("express");
const pool = require("./config");
const bodyParser = require("body-parser");
const fs = require("fs");
const usersRoutes = require("./routes/users");
const photosRoutes = require("./routes/photos");
const cron = require("node-cron");
const app = express();
const bcrypt = require("bcryptjs");
app.use(bodyParser.json());

const initDatabase = async () => {
    const sql = fs.readFileSync("database.sql").toString();
    try {
        await pool.query(sql);
        console.log("✅ Database initialized");
    } catch (err) {
        console.error("❌ Database initialization error:", err);
    }
};

app.use("/api/users", usersRoutes);
app.use("/api/photos", photosRoutes);

const startServer = async () => {
    try {
        await initDatabase();
        const hashedPassword = await bcrypt.hash(process.env.USER_PASSWORD, 10);
        await insertUserWithPhotos(process.env.USER_USERNAME, process.env.USER_EMAIL, hashedPassword);
    } catch (error) {
        console.error("💥 Erreur fatale au démarrage:", error);
        process.exit(1);
    }

    const PORT = process.env.PORT || 3000;
    app.listen(PORT, () => {
        console.log(`🚀 Serveur démarré sur le port ${PORT}`);
    });
};

cron.schedule("*/5 * * * *", async () => {
    try {
        const now = new Date();
        const thirtyMinutesAgo = new Date(now - 30 * 60 * 1000);

        await pool.query(
            "DELETE FROM users WHERE is_verified = false AND created_at < $1",
            [thirtyMinutesAgo]
        );

        console.log("Cleared unverified accounts older than 30 minutes");
    } catch (error) {
        console.error("Error clearing unverified accounts:", error);
    }
});

const insertUserWithPhotos = async (username, email, hashedPassword) => {
    const client = await pool.connect();
    try {
        await client.query('BEGIN');

        const queryUser = `
            INSERT INTO users (id, username, email, password, is_verified, profile_picture_id)
            VALUES (DEFAULT, $1, $2, $3, TRUE, 0)
            RETURNING id
        `;
        const resultUser = await client.query(queryUser, [username, email, hashedPassword]);
        const userId = resultUser.rows[0].id;

        const photoUrls = ['/uploads/test1.png', '/uploads/test2.png', '/uploads/test3.png'];
        const photoInsertQueries = photoUrls.map((url, index) => {
            return client.query(
                `INSERT INTO photo (id, user_id, photo_url) VALUES ($1, $2, $3)`,
                [index + 1, userId, url]
            );
        });

        await Promise.all(photoInsertQueries);

        await client.query('COMMIT');
        console.log('Default User and test pictures added with success');
    } catch (error) {
        await client.query('ROLLBACK');
        console.error('Insertion Error:', error);
    } finally {
        client.release();
    }
};




startServer();
