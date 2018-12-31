
const alphaToWhite = data8U => {
	for (let i = 0; i < data8U.length; i += 4) {
		if (data8U[i + 3] == 0) {
			data8U[i] = 255;
			data8U[i + 1] = 255;
			data8U[i + 2] = 255;
			data8U[i + 3] = 255;
		}
	}
}

const wh = window.innerHeight
const ww = window.parent.screen.width
const hh = document.getElementById("canvas-container").clientHeight
const ttest = `${hh} ${wh} ${(hh - wh) / 2}`
alert(ttest)
document.getElementById("canvas-container").style.bottom = `${(hh - wh) / 2}px`

// Worldの生成
const createEngine = parentNode => {
	const Engine = Matter.Engine;
	const World = Matter.World;
	const Bodies = Matter.Bodies;
	const MouseConstraint = Matter.MouseConstraint;

	let engine = Engine.create(parentNode, {
		render: {
			options: {
				wireframes: false,
				background: 'white',
				height: wh,
				width: ww
			}
		}
	});

	// Create ground and wall
	const option = {
		isStatic: true,
		render: {
			fillStyle: "#5abfb7"
		}
	}
	let ground = Bodies.rectangle(0, wh + 10, ww * 2, 60, option);
	let leftWall = Bodies.rectangle(0, 0, 30, wh * 2, option);
	let rightWall = Bodies.rectangle(ww, 0, 30, wh * 2, option);
	World.add(engine.world, [ground, leftWall, rightWall]);

	let mouseConstraint = MouseConstraint.create(engine);
	World.add(engine.world, mouseConstraint);

	Engine.run(engine);
	return engine;
}

const engine = createEngine(document.getElementById('canvas-container'))

const createTextureData = (sourceCanvas, bounds) => {
	let canvas = document.createElement('canvas');
	canvas.width = bounds.max.x - bounds.min.x + 1;
	canvas.height = bounds.max.y - bounds.min.y + 1;

	canvas.getContext('2d').drawImage(sourceCanvas, bounds.min.x, bounds.min.y, canvas.width, canvas.height, 0, 0, canvas.width, canvas.height);
	return canvas.toDataURL();
}

const createTexture = (image, w, h) => {
	let canvas = document.createElement('canvas');
	canvas.width = w;
	canvas.height = h;
	let context = canvas.getContext('2d');

	const img = new Image()
	img.src = `./img/${image}`
	context.drawImage(img, 0, 0)

	let source = cv.imread(canvas);
	alphaToWhite(source.data);
	let destC1 = new cv.Mat(canvas.height, canvas.width, cv.CV_8UC1)
	let destC4 = new cv.Mat(canvas.height, canvas.width, cv.CV_8UC4)

	cv.cvtColor(source, destC1, cv.COLOR_RGBA2GRAY);
	cv.threshold(destC1, destC4, 254, 255, cv.THRESH_BINARY);
	cv.bitwise_not(destC4, destC4);

	let contours = new cv.MatVector();
	let hierarchy = new cv.Mat();
	cv.findContours(destC4, contours, hierarchy, cv.RETR_TREE, cv.CHAIN_APPROX_SIMPLE, { x: 0, y: 0 });
	hierarchy.delete();
	destC1.delete();
	destC4.delete();
	source.delete();

	let points = [];
	for (let i = 0; i < contours.size(); i++) {
		let d = contours.get(i).data32S;
		for (let j = 0; j < d.length; j++) {
			points.push(d[j]);
		}
	}
	contours.delete();

	if (points.length < 3) {
		return null;
	}

	let _points = new cv.Mat(1, points.length / 2, cv.CV_32SC2);
	let d = _points.data32S;
	for (let i = 0; i < points.length; i++) {
		d[i] = points[i];
	}
	let hull = new cv.Mat();
	cv.convexHull(_points, hull);
	_points.delete();

	let vert = [];
	d = hull.data32S;
	for (let i = 0; i < d.length; i += 2) {
		vert.push({ x: d[i], y: d[i + 1] });
	}
	hull.delete();

	const bounds = Matter.Bounds.create(vert)
	const texture = createTextureData(canvas, bounds)

	return {
		vert: vert,
		texture: texture
	};
}

const init = (image, w, h, pos = ww / 2) => {
	const info = createTexture(image, w, h)
	let matsuri = Matter.Bodies.fromVertices(pos, 0, info.vert, {
		render: {
			sprite: {
				texture: info.texture
			}
		}
	});

	Matter.World.add(engine.world, matsuri);
}

const app = () => {
	init("matsuri.png", 168, 231)
	document.getElementById('canvas-container').addEventListener('click', () => {
		const randam = Math.random() * ((ww - 30) - 30)
		init("masyumaro.png", 43, 39, randam)
	});
	document.getElementById('canvas-container').addEventListener('touchstart', () => {
		const randam = Math.random() * ((ww - 30) - 30)
		init("masyumaro.png", 43, 39, randam)
	});
}

const preload = () => ["matsuri.png", "masyumaro.png"].map(image =>
	new Promise(resolver => {
		let img = new Image()
		img.src = `./img/${image}`
		return img.addEventListener("load", () => resolver(0))
	})
)

Promise.all(preload()).then(() => app())


