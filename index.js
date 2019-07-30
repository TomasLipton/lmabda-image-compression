const AWS = require("aws-sdk");
const imagemin = require('imagemin');
const imageminJpegtran = require('imagemin-jpegtran');
const imageminPngquant = require('imagemin-pngquant');

exports.handler = (event, context, callback) => {
    const s3 = new AWS.S3();
    const sourceBucket = "test.img.lambda";
    const objectKey = decodeURIComponent(event.Records[0].s3.object.key.replace(/\+/g, '%20'));

    const getObjectParams = {
        Bucket: sourceBucket,
        Key: objectKey,
    };

    const isOptimized = tag => tag.TagSet[0] && tag.TagSet[0].Key === "optimized";

    const putObject = (files, contentType) => {
        s3.putObject({
            Body: files,
            Bucket: sourceBucket,
            ContentType: contentType,
            Key: objectKey,
            Tagging: "optimized=true"
        }).promise()
            .then(data => console.log("S3 compressed object upload successful."))
            .catch(err => console.log(err, err.stack));
    };

    const getObjectTagging = (data, getObjectParams) => {
        s3.getObjectTagging(getObjectParams)
            .promise()
            .then(dataTag => {
                if (isOptimized(dataTag)) {
                    console.log("Image already optimized");
                } else {
                    (async () => {
                        const files = await imagemin.buffer(data.Body, {
                            plugins: [
                                imageminJpegtran(),
                                imageminPngquant({
                                    quality: [0.6, 0.8]
                                })
                            ]
                        });
                        putObject(files, data.ContentType);
                    })();
                }
            })
            .catch(err => console.log(err));
    };

    s3.getObject(getObjectParams)
        .promise()
        .then(data => getObjectTagging(data, getObjectParams))
        .catch(err => console.log(err));
};
