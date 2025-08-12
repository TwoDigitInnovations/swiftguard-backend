
const multer = require('multer'),
    multerS3 = require('multer-s3');
const { S3Client } = require('@aws-sdk/client-s3');

s3 = new S3Client({
    credentials: {
        secretAccessKey: process.env.AWS_SECRET_KEY,
        accessKeyId: process.env.AWS_ACCESS_KEY
    },
    region: 'us-east-1'
});

module.exports = {
    upload: multer({
        storage: multerS3({
            s3: s3,
            acl: 'public-read',
            bucket: 'service-app-docs',
            key: function (req, file, cb) {
                cb(null, `${new Date().getTime()}-${req.user.id}-${file.originalname}`);
            }
        })
    })
}