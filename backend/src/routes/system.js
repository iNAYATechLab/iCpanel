// All code, comments, and variables are strictly in English:

const express = require('express');
const os = require('os');
const router = express.Router();
const si = require('systeminformation');
const authMiddleware = require('../middleware/auth');
const config = require('../config');

/**
 * @route   GET /api/system/metrics
 * @desc    Get real-time system metrics (CPU, Memory, Disk)
 * @access  Private
 */
router.get('/metrics', authMiddleware, async (req, res) => {
    try {
        const cpu = await si.currentLoad();
        const mem = await si.mem();
        const disk = await si.fsSize();

        res.json({
            cpu_usage: cpu.currentLoad.toFixed(2),
            ram_used: (mem.used / 1024 / 1024 / 1024).toFixed(2), // GB
            ram_total: (mem.total / 1024 / 1024 / 1024).toFixed(2), // GB
            ram_percentage: ((mem.used / mem.total) * 100).toFixed(2),
            disk_percentage: disk[0] ? disk[0].use.toFixed(2) : 0,
            disks: disk.map((d) => ({
                mount: d.mount,
                use: d.use.toFixed(2),
                used_gb: (d.used / 1024 / 1024 / 1024).toFixed(2),
                size_gb: (d.size / 1024 / 1024 / 1024).toFixed(2)
            })),
            uptime_seconds: Math.round(os.uptime()),
            timestamp: new Date().toISOString()
        });
    } catch (error) {
        console.error('[system] metrics failed:', error.message);
        res.status(500).json({ error: 'Failed to fetch system metrics' });
    }
});

/**
 * @route   GET /api/system/info
 * @desc    Static host information for the Settings / Dashboard panels
 * @access  Private
 */
router.get('/info', authMiddleware, async (req, res) => {
    try {
        const [osInfo, cpu] = await Promise.all([si.osInfo(), si.cpu()]);

        res.json({
            hostname: osInfo.hostname,
            platform: osInfo.platform,
            distro: osInfo.distro,
            release: osInfo.release,
            kernel: osInfo.kernel,
            arch: osInfo.arch,
            cpu_model: cpu.brand,
            cpu_cores: os.cpus().length,
            node_version: process.version,
            service_mode: config.serviceMode,
            files_base_dir: config.filesBaseDir
        });
    } catch (error) {
        console.error('[system] info failed:', error.message);
        res.status(500).json({ error: 'Failed to fetch system information' });
    }
});

module.exports = router;
