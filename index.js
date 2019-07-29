var AWS = require("aws-sdk");
var FS = require("fs");
const imagemin = require('imagemin');
const imageminJpegtran = require('imagemin-jpegtran');
const imageminPngquant = require('imagemin-pngquant');

exports.handler = (event, context, callback) => {
    var s3 = new AWS.S3();
    var sourceBucket = "test.img.lambda";

    var objectKey = decodeURIComponent(event.Records[0].s3.object.key.replace(/\+/g, '%20'));

    var getObjectParams = {
        Bucket: sourceBucket,
        Key: objectKey,
    };

    s3.getObject(getObjectParams)
        .promise()
        .then(data => {
            s3.getObjectTagging(getObjectParams)
                .promise()
                .then(dataTag => {
                    if (dataTag.TagSet[0] && dataTag.TagSet[0].Key === "optimized") {
                        console.log("image already optimized");
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

                            s3.putObject({
                                Body: files,
                                Bucket: sourceBucket,
                                ContentType: data.ContentType,
                                Key: objectKey,
                                Tagging: "optimized=true"
                            }).promise()
                                .then(data => {
                                    console.log("S3 compressed object upload successful.");
                                })
                                .catch(err => {
                                    console.log(err, err.stack);
                                });
                        })();
                    }
                })
                .catch(err => {
                    console.log(err);
                });
        })
        .catch(err => {
            console.log(getObjectParams);
            console.log(err);
        });
};
