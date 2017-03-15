let request = require("request");
let Jimp = require("jimp");
let smartcrop = require("smartcrop");

let jimpIo = {
	open: function (jimpImage) {
		var image = jimpImage.clone();
		return Promise.resolve({
			jimp: image,
			width: image.bitmap.width,
			height: image.bitmap.height
		})
	},
	resample: function (image, width, height) {
		return Promise.resolve({
			jimp: image.jimp,
			width: ~~width,
			height: ~~height
		});
	},
	getData: function (image) {
		var resized = image.jimp.resize(image.width, image.height);
		return Promise.resolve(new smartcrop.ImgData(resized.bitmap.width, resized.bitmap.height, resized.bitmap.data));
	}
};

function resize(context, req) {
	var url = req.query.url;
	var targetWidth = parseInt(req.query.width, 10);
	var targetHeight = parseInt(req.query.height, 10);

	context.log(`ResizeImage: Begin resizing file '${url}'`);

	return Jimp.read(url).then(function (img) {
		return smartcrop.crop(img, {
			width: targetWidth,
			height: targetHeight,
			imageOperations: jimpIo
		}).then(function (result) {
			return {
				image: img,
				crop: result.topCrop
			};
		});
	}).then(function (data) {
		var crop = data.crop;
		var image = data.image;

		return new Promise(function (resolve, reject) {
			image
				.crop(crop.x, crop.y, crop.width, crop.height)
				.resize(targetWidth, targetHeight)
				.quality(60)
				.getBuffer(Jimp.MIME_JPEG, function (error, stream) {
					if (error) {
						reject();
					}

					context.res = {
						isRaw: true,
						status: 200,
						headers: {
							"Content-Type": Jimp.MIME_JPEG
						},
						body: stream
					}

					context.log(`ResizeImage: Finished resizing file '${url}'.`);
					resolve();
				});
		});
	});
};

module.exports = resize;
