const mongoose = require('mongoose');
const User = require('./models/User');

const images = [
    'https://lh3.googleusercontent.com/aida-public/AB6AXuCkgwiJtHtag0W-zOSpncdJl_HF_qVuyLF8gYqAYpCEL2c39sq21okLcK3iP3W7H9LzOBe4_MLdYaHRKpqTKiz-j_IZZ-GPq0TxgFk2HW-leIiPYJm1Ylib3RpH28tYSD8ZXjwa7F2zsHCuwcOHoKiY9g7zwbA5w43o-BpKAoOsD-EFm15w9qzc5mpOd_SWaU92W7ez_6EwOQl3DcCzzC1CFtINQjSSnGJsdKYa-P_RjjtGHKXKb7m9uxKmOfNpOXD5xJL64ZYAkfQ',
    'https://lh3.googleusercontent.com/aida-public/AB6AXuC2FwzIxfv0QEzMhdDMOqNzIhWVaLVILVCIQyqPW4GB2ieSL4PtoFQp7zzRQ1-YLDwTgreIrU_SLbdfMbSP_WCR2Sq1lmqvgxudTUVWgX52WmaPCAWTSNqn-AF0HGRXI3nP11ISdnErw1ziGXeg5JZO2yWlNjwYPVO31e50D_TCHmsoDC59U5TyG3_Ih8GKcNt-M8niJs-o6c8e_AOehwj0I51EOs55CKNYwdJenUldoGL4kwnvpRvjF0-5KsX3S6N3UnaP9ht3f48',
    'https://lh3.googleusercontent.com/aida-public/AB6AXuCNnG65I1ZtJqD1B3r61wTQ2Q8PlHM2siHwGDJiRYbZB6Vsywrahvt5g0HgGfqGly6np85qpduZoHeTCCuhR2Ca4CKhMxN7NZBeVmU1OoyJucW1O-1T1vTFzy6fRociLbkcsa79D2s1Qbp-uqmNhkGBm4_NsN97Dum-EAuV9SEepfJ52abJ312KVzhBDcos4BX2WZvro_uxVxiAt0mu0PKoALO-42Zf5KQwuejOhGC7V5GcuGCU7wesbZVva7rXO5EDipM_YAQpkRQ',
    'https://lh3.googleusercontent.com/aida-public/AB6AXuBZuL8AUNoYcAuP870cdB9fCSOhk9MnrudX7eEkRWl2WOuaci1_E-FvACPtIpBihKL2G9CVj-A25xXP8Sz8n5VFmhGKaDlyMnv9jFQ1xSKrPL9QoEGFqX8ULdIidzR-jvl3Kta8qMX-8YI_wOxhLxy_b_8B0Li-0vOAGMqvlDJxcXFF5Pyi57nCidxDKL6Q0EKB5e4ID9_fqYi6AeiBj24vV_sUh7kZrWfWmfkiaNa_2Z_8ND1OBD4XnEu-T42-JHm4xEeGRb7rusk'
];

async function run() {
    try {
        await mongoose.connect('mongodb://127.0.0.1:27017/kampuslegacy');
        console.log('Connected to DB. Seed images starting...');

        const mentors = await User.find({ role: 'mentor' });
        for (let i = 0; i < mentors.length; i++) {
            const mentor = mentors[i];
            if (!mentor.profilePicture) {
                mentor.profilePicture = images[i % images.length];
                await mentor.save();
                console.log(`Updated mentor ${mentor.email}`);
            }
        }
        console.log('Done.');
        process.exit(0);
    } catch (err) {
        console.error(err);
        process.exit(1);
    }
}

run();
