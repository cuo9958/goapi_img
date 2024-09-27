import Express from 'express';
import axios from 'axios';
import path from 'path';
import fs from 'fs';
import { pipeline } from 'stream';

const app = Express();
const ROOT_PATH = path.join(process.cwd(), '.images');
const image_list = new Set();

// app.use((req, res, next) => {
//     console.log(`请求方法: ${req.method}`);
//     console.log(`请求路径: ${req.url}`);
//     console.log(`请求时间: ${new Date().toISOString()}`);
//     next();
// });

app.get('/mj/:name', async (req, res) => {
    res.header('Access-Control-Allow-Origin', '*');
    res.header('Access-Control-Allow-Headers', '*');
    res.header('Access-Control-Allow-Methods', 'GET, POST, OPTIONS, PATCH, PUT, DELETE');
    res.header('Allow', 'GET, POST, PATCH, OPTIONS, PUT, DELETE');

    const modified = req.headers['if-modified-since'];
    if (modified) {
        res.header('last-modified', modified);
        res.sendStatus(304);
        return;
    }
    if (!req.params.name) {
        res.sendStatus(404);
        return;
    }
    const cache_path = path.join(ROOT_PATH, req.params.name);
    if (image_list.has(req.url)) {
        return fs.createReadStream(cache_path).pipe(res);
    }
    try {
        const response = await axios.get(`https://img.midjourneyapi.xyz${req.url}`, {
            withCredentials: false,
            responseType: 'stream',
        });
        console.log('请求', req.url);
        if (response.headers['last-modified']) {
            res.header('last-modified', response.headers['last-modified']);
        }
        response.data.pipe(res);
        pipeline(response.data, fs.createWriteStream(cache_path), (error) => {
            if (error) {
                console.log('下载失败', req.url);
            } else {
                image_list.add(req.url);
            }
        });
    } catch (error) {
        console.log('请求失败', req.url);
        res.send('失败');
    }
});

const PORT = process.env.PORT || 8089;
// 启动服务器
app.listen(PORT, () => {
    console.log(`Server is running on http://localhost:${PORT}`);
});
