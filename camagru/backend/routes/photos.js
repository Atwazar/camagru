const express = require("express");
const pool = require("../config");
const authenticateToken = require("../middleware/auth");
const Jimp = require("jimp");
const { v4: uuidv4 } = require("uuid");
const fs = require("fs");

const router = express.Router();



router.get("/:photoId?", authenticateToken, async (req, res) => {
    const userId = req.user.userId;
    const { userId: queryUserId, mine, liked, commented } = req.query;
    const photoId = req.params.photoId;

    try {
        if (photoId) {
            const result = await pool.query(`
                SELECT p.id, p.photo_url, p.user_id, u.username AS user_username, 
                    COUNT(l.id) AS likes_count,
                    EXISTS (SELECT 1 FROM likes WHERE photo_id = p.id AND user_id = $2) AS is_liked,
                    COALESCE(json_agg(json_build_object(
                        'id', c.id, 
                        'user_id', c.user_id, 
                        'username', cu.username, 
                        'content', c.content, 
                        'created_at', c.created_at
                    ) ORDER BY c.created_at DESC) FILTER (WHERE c.id IS NOT NULL), '[]') AS comments
                FROM photo p
                LEFT JOIN users u ON p.user_id = u.id
                LEFT JOIN likes l ON p.id = l.photo_id
                LEFT JOIN comments c ON p.id = c.photo_id
                LEFT JOIN users cu ON c.user_id = cu.id
                WHERE p.id = $1
                GROUP BY p.id, p.user_id, u.username;
            `, [photoId, userId]);

            if (result.rows.length === 0) {
                return res.status(404).json({ error: "Photo not found" });
            }

            const photo = result.rows[0];

            return res.json({
                id: photo.id,
                photo_url: photo.photo_url,
                user_username: photo.user_username,
                likes_count: photo.likes_count,
                is_liked: photo.is_liked,
                is_owner: photo.user_id === userId,
                comments: photo.comments
            });
        }

        let query = `
            SELECT p.id, p.photo_url, p.user_id, u.username AS user_username, 
                COUNT(l.id) AS likes_count,
                EXISTS (SELECT 1 FROM likes WHERE photo_id = p.id AND user_id = $1) AS is_liked
            FROM photo p
            LEFT JOIN users u ON p.user_id = u.id
            LEFT JOIN likes l ON p.id = l.photo_id
        `;

        let queryParams = [userId];

        if (mine) {
            query += ` WHERE p.user_id = $1 `;
        }
        else if (queryUserId) {
            queryParams.push(queryUserId);
            query += ` WHERE p.user_id = $2 `;
        }
        else if (liked) {
            query += `
                JOIN likes l2 ON p.id = l2.photo_id 
                WHERE l2.user_id = $1
            `;
        }
        else if (commented) {
            query += `
                JOIN comments c ON p.id = c.photo_id 
                WHERE c.user_id = $1
            `;
        }

        query += `
            WHERE p.is_default = false
            GROUP BY p.id, p.user_id, u.username
            ORDER BY p.uploaded_at DESC
        `;

        const result = await pool.query(query, queryParams);

        const photos = result.rows.map(photo => ({
            id: photo.id,
            photo_url: photo.photo_url,
            username: photo.user_username,
            likes_count: parseInt(photo.likes_count, 10),
            is_owner: userId === photo.user_id,
            is_liked: photo.is_liked
        }));

        res.json(photos);

    } catch (error) {
        console.error(error);
        res.status(500).json({ error: "Server Error" });
    }
});



router.post("/", authenticateToken, async (req, res) => {
    const { photo, accessory } = req.body;
    const userId = req.user.id;
    if (!photo || !accessory) {
        return res.status(400).json({ error: "Photo and superposable image required" });
    }

    try {
        const imageBuffer = Buffer.from(photo.replace(/^data:image\/\w+;base64,/, ""), "base64");
        const baseImage = await Jimp.read(imageBuffer);

        const accessoryPath = path.join(__dirname, "../assets", accessory);
        if (!fs.existsSync(accessoryPath)) {
            return res.status(404).json({ error: "Superposable Image not found." });
        }
        const overlay = await Jimp.read(accessoryPath);

        overlay.resize(baseImage.bitmap.width / 3, Jimp.AUTO);
        const posX = (baseImage.bitmap.width - overlay.bitmap.width) / 2;
        const posY = baseImage.bitmap.height / 4;

        baseImage.composite(overlay, posX, posY, {
            mode: Jimp.BLEND_SOURCE_OVER,
            opacitySource: 1,
            opacityDest: 1
        });

        const fileName = `photo_${uuidv4()}.png`;
        const filePath = path.join(__dirname, "../uploads", fileName);
        await baseImage.writeAsync(filePath);

        const photoUrl = `/uploads/${fileName}`;
        const result = await pool.query(
            `INSERT INTO photo (user_id, photo_url) VALUES ($1, $2) RETURNING *`,
            [userId, photoUrl]
        );

        res.status(201).json(result.rows[0]);
    } catch (error) {
        console.error("Error while treating the image :", error);
        res.status(500).json({ error: "Server Error." });
    }
});

router.delete("/:photoId", authenticateToken, async (req, res) => {
    const userId = req.user.userId;
    const photoId = req.params.photoId;
    console.log(`user with id ${userId} is trying to like photo with id ${photoId}`);

    try {
        const photoResult = await pool.query(`
            SELECT * FROM photo WHERE id = $1 AND user_id = $2;
        `, [photoId, userId]);

        if (photoResult.rows.length === 0) {
            return res.status(403).json({ error: "You can not delete this photo" });
        }

        await pool.query(`
            DELETE FROM photo WHERE id = $1
        `, [photoId]);

        res.status(200).json({ message: "Photo deleted" });
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: "Server Error" });
    }
});

router.post("/like", authenticateToken, async (req, res) => {
    const userId = req.user.userId;
    const { photoId } = req.body;

    if (!photoId) {
        return res.status(400).json({ error: "photoId is required." });
    }

    try {
        const checkLike = await pool.query(`
            SELECT * FROM likes WHERE user_id = $1 AND photo_id = $2
        `, [userId, photoId]);

        if (checkLike.rows.length > 0) {
            return res.status(400).json({ error: "You have already liked this photo." });
        }
        console.log(`user with id ${userId} is trying to like photo with id ${photoId}`);

        await pool.query(`
            INSERT INTO likes (user_id, photo_id) VALUES ($1, $2)
        `, [userId, photoId]);

        res.status(200).json({ message: "Like added successfully" });
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: "Internal server error" });
    }
});

router.delete("/like/:photoId", authenticateToken, async (req, res) => {
    const userId = req.user.userId;
    const photoId = req.params.photoId;

    if (!photoId) {
        return res.status(400).json({ error: "photoId required." });
    }

    try {
        const checkLike = await pool.query(
            "SELECT * FROM likes WHERE user_id = $1 AND photo_id = $2",
            [userId, photoId]
        );

        if (checkLike.rows.length === 0) {
            return res.status(400).json({ error: "You don't like this photo, i'm telling you." });
        }

        await pool.query(
            "DELETE FROM likes WHERE user_id = $1 AND photo_id = $2",
            [userId, photoId]
        );

        res.status(200).json({ message: "Like deleted with success." });
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: "Server Error." });
    }
});

router.post("/:photoId/comments", authenticateToken, async (req, res) => {
    const userId = req.user.userId;
    const photoId = req.params.photoId;
    const { text } = req.body;

    if (!text || text.trim() === "") {
        return res.status(400).json({ error: "A comment needs body" });
    }

    try {
        const result = await pool.query(`
            INSERT INTO comments (content, user_id, photo_id) 
            VALUES ($1, $2, $3) RETURNING *;
        `, [text, userId, photoId]);

        res.status(201).json(result.rows[0]);
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: "Server Error." });
    }
});

module.exports = router;
