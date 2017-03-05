function Timeline3d () {
	'use strict';

	this.init = function() {
		var self = this;

		self.canvasWrap        = document.querySelector('.timeline__canvas-wrap');
		self.parentBlock       = document.querySelector('.timeline');
		self.timelineScale     = document.querySelector('.timeline-scale');
		self.timelineStrips    = document.querySelector('.timeline-scale__strips');
		self.timelineDecor     = document.querySelector('.timeline__decor');
		self.timelineContainer = document.querySelector('.timeline-container');
		self.timelineShade     = document.querySelector('.timeline__shade');
		self.spinnerFacts      = document.querySelector('.timeline__spinner-facts');
		self.spinnerData       = document.querySelector('.timeline__spinner-data');

		self.fontFaceObserver = new FontFaceObserver('BebasNeueRegular');
		self.fontFaceObserverCountries = new FontFaceObserver('ProximaNova-Bold');
		self.loadData();
		self.dateTextSize();
		self.deviceDetect();
		self.showHint();

		self.scene = new THREE.Scene();
		if (self.isMobile) {//different fog level for mobile and desktop, caused different view angles
			self.scene.fog = new THREE.Fog( 0xffffff, 25, 100 );
		} else {
			self.scene.fog = new THREE.Fog( 0xffffff, 0, 75 );
		}
		self.camera = new THREE.PerspectiveCamera(60 , self.canvasWidth / self.canvasHeigth , 0.1, 10000);
		self.renderer = new THREE.WebGLRenderer({antialias: true});
		self.renderer.setPixelRatio( window.devicePixelRatio );
		self.renderer.setClearColor('#ffffff');
		self.renderer.setSize(self.canvasWidth, self.canvasHeigth);

		self.cameraSettings();
		self.disableScroll();
		self.popupEvents();
		self.buildAlongLines();
		self.buildCountriesPanel();
		self.buildAcrossLines();
		self.buildFacts();
		self.hoverReactions();
		self.reDraw();
		self.buildScale();

		window.addEventListener('resize', function() {
			self.reDraw();
		});
	};
}

Timeline3d.prototype.deviceDetect = function() {
	'use strict';
	var self = this,
		ratio;

	self.viewportWidth = Math.max(document.documentElement.clientWidth, window.innerWidth || 0);
	self.viewportHeigth = Math.max(document.documentElement.clientHeight, window.innerHeight || 0);

	if (self.viewportWidth <= 900) {
		//low screen
		self.isMobile = true;
		self.canvasWidth = self.viewportWidth;
		self.canvasHeigth = self.viewportHeigth;
	} else {
		//wide screen
		self.isMobile = false;
		self.canvasWidth = document.querySelector('.timeline__canvas-wrap').clientWidth;
		self.canvasHeigth = document.querySelector('.timeline__canvas-wrap').clientHeight;
	}

	ratio = self.viewportWidth / self.viewportHeigth;
	self.isLandscape = (ratio > 1.3) ? true : false;
};

Timeline3d.prototype.showHint = function() {
	'use strict';
	var self = this,
		mc = new Hammer(window);

	if (!self.isMobile) {
		self.timelineContainer.classList.toggle('timeline-container--mobile-hint');
	}
	self.timelineShade.addEventListener('click', function() {
		self.timelineContainer.classList.remove('timeline-container--mobile-hint');
	});

	mc.on('panstart', function() {
		self.timelineContainer.classList.remove('timeline-container--mobile-hint');
	});
};

Timeline3d.prototype.reDraw = function() {
	'use strict';
	var self = this;

	self.deviceDetect();
	if (self.preiousOrientation === !self.isLandscape) {
		document.location.reload(false);
	}
	self.preiousOrientation = self.isLandscape;

	//if (self.previousDevise !== undefined && self.previousDevise !== self.isMobile) {//for facts rebuilding on device change. Need deleting facts from scene
		//self.buildFacts();
	//}
	//self.previousDevise = self.isMobile;

	self.renderer.setSize(self.canvasWidth, self.canvasHeigth);
	self.camera.aspect = self.canvasWidth / self.canvasHeigth;
	self.camera.updateProjectionMatrix();
	self.hoverCalibrate();
	self.setCameraPosition();
	self.renderer.render(self.scene, self.camera);
};

Timeline3d.prototype.loadData = function() {
	'use strict';
	var self = this;

	function loadJSON(callback) {

	var xobj = new XMLHttpRequest();
		xobj.overrideMimeType('application/json');
	xobj.open('GET', 'data/data.json', false);
	xobj.onreadystatechange = function () {
		if (xobj.readyState == 4 && xobj.status == '200') {
			callback(xobj.responseText);
		}
	};
		xobj.send(null);
	}

	loadJSON(function(response) {
		var actual_JSON = JSON.parse(response);
		self.getData(actual_JSON);
	});
};

Timeline3d.prototype.getData = function(data) {
	'use strict';
	var self = this;

	self.countries = [];
	self.countriesColors = [];
	data.countries.forEach(function(item, i){
		self.countries[i] = item.country;
		self.countriesColors[i] = item.color;
	});
	self.dates = data.dates;
	self.facts = data.facts;
};

Timeline3d.prototype.buildAlongLines = function() {
	'use strict';
	var self = this,
	timeLineGeometry = new THREE.PlaneGeometry(self.lineWidth(),10000,1,1);

	self.mainColorMaterial = new THREE.MeshBasicMaterial({color: 0x1a4096});
	self.darkColorMaterial = new THREE.MeshBasicMaterial({color: 0x000000});

	self.leftLine = new THREE.Mesh(timeLineGeometry, self.mainColorMaterial);
	self.leftLine.rotation.x= -0.5 * Math.PI;
	self.leftLine.position.x = 5;
	self.leftLine.position.y = 0;
	self.leftLine.position.z = -500;
	self.scene.add(self.leftLine);

	//country lines
	self.countryLines = [];
	self.countries.forEach(function(item, i){
		var diff = self.leftLine.position.x * 2;
		self.countryGapWidth = diff / self.countries.length;
		self.countryLines[i] = new THREE.Mesh(timeLineGeometry, self.mainColorMaterial);
		self.countryLines[i].rotation.x = -0.5 * Math.PI;
		self.countryLines[i].position.x = self.leftLine.position.x - self.countryGapWidth * (i + 1);
		self.countryLines[i].position.y = 0;
		self.countryLines[i].position.z = -500;
		self.scene.add(self.countryLines[i]);
	});
};

Timeline3d.prototype.buildCountriesPanel = function() {
	'use strict';
	var self = this,
	countries,
	countryName,
	ratio;

	if (self.isMobile) {
		self.fontFaceObserverCountries.load().then(function () {
			self.countriesTextWidth = [];
			self.countriesTextes = [];
			self.countries.forEach(function(item, i){
				self.countriesTextes[i] = {};
				var fontOptions = {
					'textColor': { 'r':0, 'g':0, 'b':0, 'a':1.0 },
					'borderColor': { 'r':0, 'g':0, 'b':0, 'a':1.0 },
					'backgroundColor': { 'r':255, 'g':255, 'b':255, 'a':1.0 },
					'fontsize' : 100,
					'fontface' : 'ProximaNova-Bold'
					},
					text;
				self.scene.add(self.makeTextSprite(item, fontOptions, 'country', self.countriesTextes[i], 0));
				text = self.countriesTextes[i].country;
				self.countriesTextWidth[i] = new THREE.Box3().setFromObject(text).getSize().x;

				text.rotation.set(1.5 * Math.PI, 0, 1.5 * Math.PI);

				ratio = self.canvasWidth / self.canvasHeigth;
				self.zOffsetByHeight = (-4 * ratio + 7.1) / - 1.21;//liniar function. got experementally.
				text.position.z = self.countriesZOffset = self.zOffsetByHeight - self.countriesTextWidth[i] / 2;

				text.position.x = self.leftLine.position.x - self.countryGapWidth * i - 1;
				text.position.y = 0.02;
			});

			self.loading.panel = true;
			window.dispatchEvent(self.loadingComplete);
		});
	} else {
		countries = document.createElement('div');
		countries.className = 'timeline__countries';
		self.canvasWrap.appendChild(countries);

		self.countries.forEach(function(item){
			var country = document.createElement('div');
			country.className = 'timeline__country';
			countries.appendChild(country);

			countryName = document.createElement('div');
			countryName.className = 'timeline__country-name';
			countryName.innerHTML = item;
			country.appendChild(countryName);
		});

		self.loading.panel = true;
		window.dispatchEvent(self.loadingComplete);
	}
};

Timeline3d.prototype.buildAcrossLines = function() {
	'use strict';
	var self = this,
		acrossLineGeometry = new THREE.PlaneGeometry(self.lineWidth(),16,1,1),
		dashLenth = 0.5,
		acrossDashGeometry = new THREE.PlaneGeometry(self.lineWidth(),dashLenth,1,1),
		datePoints = [];

	self.dateGapLength = 6;

	self.fontFaceObserver.load().then(function () {

		var i,
			dashI,
			fontOptions,
			text;
		for (i = 0; i < self.dates.length; i +=1) {
			datePoints[i] = {};
			datePoints[i].dateText = self.dates[i];

			//date lines
			datePoints[i].acrossLine = new THREE.Mesh(acrossLineGeometry, self.mainColorMaterial);
			datePoints[i].acrossLine.rotation.x= -0.5 * Math.PI;
			datePoints[i].acrossLine.rotation.z= -0.5 * Math.PI;
			datePoints[i].acrossLine.position.x = 0;
			datePoints[i].acrossLine.position.y = 0;
			datePoints[i].acrossLine.position.z = i * self.dateGapLength;
			self.scene.add(datePoints[i].acrossLine);

			//ruler
			if (i !== self.dates.length - 1) {
				for (dashI = 1; dashI < 11; dashI +=1) {
					datePoints[i].acrossDash = new THREE.Mesh(acrossDashGeometry, self.mainColorMaterial);
					datePoints[i].acrossDash.rotation.x= -0.5 * Math.PI;
					datePoints[i].acrossDash.rotation.z= -0.5 * Math.PI;
					datePoints[i].acrossDash.position.x = 5 + dashLenth / 2;
					datePoints[i].acrossDash.position.y = 0;
					if (dashI === 10) {// for build long dash if dashI === 9
						datePoints[i].acrossDash.position.z = (self.dateGapLength / 10 * 5) + (i * self.dateGapLength);
						datePoints[i].acrossDash.position.x = 5 + dashLenth * 1.5;
					} else {//all other dashes
						datePoints[i].acrossDash.position.z = (self.dateGapLength / 10 * dashI) + (i * self.dateGapLength);
					}
					self.scene.add(datePoints[i].acrossDash);
				}
			}
			//text dates
			fontOptions = {
				'textColor': { 'r':0, 'g':0, 'b':0, 'a':1.0 },
				'borderColor': { 'r':0, 'g':0, 'b':0, 'a':1.0 },
				'backgroundColor': { 'r':255, 'g':255, 'b':255, 'a':1.0 },
				'fontsize' : 150,
				'fontface' : 'BebasNeueRegular'
				};
			self.scene.add(self.makeTextSprite(datePoints[i].dateText, fontOptions, 'textMesh', datePoints[i], 0));
			text = datePoints[i].textMesh;
			text.rotation.set(0, Math.PI, 0);
			text.position.x = datePoints[i].acrossLine.position.x + 7.4;
			text.position.y = datePoints[i].acrossLine.position.y - 0.4;
			text.position.z = datePoints[i].acrossLine.position.z;

		}
		self.renderer.render(self.scene, self.camera);

		self.loading.lines = true;
		window.dispatchEvent(self.loadingComplete);
	});
};

Timeline3d.prototype.buildScale = function() {
	'use strict';
	var self = this,
		strips = document.querySelector('.timeline-scale__strips'),
		close = document.querySelector('.timeline-scale__close'),
		timelineScaleHeight = strips.clientHeight,
		dateStripPadding = (timelineScaleHeight - self.dates.length) / self.dates.length,
		indexOfDate,
		hammerObject = new Hammer(self.timelineStrips);
		self.timelineScale.style.touchAction = 'none';

	self.dateStrip = [];
	self.dates.forEach(function(item, i){
		self.dateStrip[i] = document.createElement('div');
		var datebox = document.createElement('div');
		datebox.className = 'timeline-scale__date-value';
		datebox.innerHTML = item;
		self.dateStrip[i].setAttribute('data-date', item);
		self.dateStrip[i].style.paddingTop = dateStripPadding / 2 + 'px';
		self.dateStrip[i].style.paddingBottom = dateStripPadding / 2 + 'px';
		self.dateStrip[i].className = 'timeline-scale__date-strip';
		strips.appendChild(self.dateStrip[i]);
		self.dateStrip[i].appendChild(datebox);
	});

	close.addEventListener('click', function() {
		self.timelineScale.classList.toggle('timeline-scale--hidden-phone');
	});

	strips.firstChild.className += ' timeline-scale__date-strip--active';

	self.timelineScale.addEventListener('click', function(e){
		if (e.target.className === 'timeline-scale__date-strip') {
			self.setScaleActivePoint(e.target);

			indexOfDate = self.dates.indexOf(parseInt(e.target.getAttribute('data-date'), 10));
			self.zPoint = indexOfDate * self.dateGapLength + self.zInitialPoint;
			self.moveCameraSmothTo(self.zPoint);
		}
	});

	hammerObject.on('pan', function(ev) {
		ev.preventDefault();
		var element = document.elementFromPoint(ev.center.x, ev.center.y);
		if (element && element.className === 'timeline-scale__date-strip') {
			self.setScaleActivePoint(element);

			indexOfDate = self.dates.indexOf(parseInt(element.getAttribute('data-date'), 10));
			self.zPoint = indexOfDate * self.dateGapLength + self.zInitialPoint;
			self.moveCameraSmothTo(self.zPoint);

			self.endOfTimeLineCheck(self.zPoint);
		}
	});
};

Timeline3d.prototype.setScaleActivePoint = function(element) {
	'use strict';
	var self = this,
		previousActive = document.querySelector('.timeline-scale__date-strip.timeline-scale__date-strip--active');

	if (element !== undefined) {
		previousActive.className = previousActive.className.replace(/\b timeline-scale__date-strip--active\b/,'');
		element.className += ' timeline-scale__date-strip--active';
	} else {
		self.setScaleActivePoint(self.dateStrip[self.dateStrip.length - 1]);
	}
};

Timeline3d.prototype.setTimePosition = function() {
	'use strict';
	var self = this,
		deltaZ = 0,
		dateIndex;

		deltaZ = self.zPoint - self.zInitialPoint;
		dateIndex = Math.round(deltaZ / self.dateGapLength);

	self.setScaleActivePoint(self.dateStrip[dateIndex]);
};

Timeline3d.prototype.buildFacts = function() {
	'use strict';
	var self = this,
		elementsSize = self.camera.position.y * 1.4;//constant got experimentally

	if (self.isLandscape) {elementsSize = self.camera.position.y * 1.9;}

	self.factsObjects = [];
	self.segmentsForCircle = 64;
	self.factsProportions = (self.isMobile) ? elementsSize : 10;

	var x = 0,
		y = 0,
		z = 0,
		previousDate,
		nextDate,
		percentOffset,
		previousDateIndex,
		measure = self.factsProportions,
		dateLineHeigth = measure * 0.3,
		chipsRadius = measure * 0.123,
		even = true;

	self.fontFaceObserver.load().then(function () {//waiting for the font loading
		self.facts.forEach(function(item, i) {
			self.factsObjects[i] = {};
			even = !even;//alternating of text size

			var countryIndex = self.countries.indexOf(item.country),
				radius = 1,
				material,
				geometry,
				planeGeometry,
				colorIndex,
				color;

			//x - positioning
			x = self.leftLine.position.x - (countryIndex + 1) * self.countryGapWidth;

			//z - positioning
			self.dates.forEach(function(date, i){
				if (item.date < date) {
					nextDate = date;
					previousDate = self.dates[i + 1];
					previousDateIndex = i + 1;
				}
			});
			percentOffset = (item.date - previousDate) / (nextDate - previousDate);
			z = (previousDateIndex * self.dateGapLength) - (percentOffset * self.dateGapLength);

			//hover point
			material = new THREE.MeshBasicMaterial( {color: 0x000000, transparent: true, opacity: 0, side: THREE.DoubleSide} );
			geometry = new THREE.CircleGeometry( radius, 10 );
			material.depthWrite = false;
			self.factsObjects[i].circle = new THREE.Mesh(geometry, material);
			self.factsObjects[i].circle.position.set(x,y,z);
			self.factsObjects[i].circle.rotation.set(0,0,0);
			self.scene.add(self.factsObjects[i].circle);

			//blue point
			radius = 0.3;
			material = new THREE.MeshBasicMaterial( { color: 0x1a4096, side: THREE.DoubleSide} );
			geometry = new THREE.CircleGeometry( radius, self.segmentsForCircle );
			self.factsObjects[i].dot = new THREE.Mesh(geometry, material);
			self.factsObjects[i].dot.position.set(x,y,z);
			self.factsObjects[i].dot.rotation.set(1.57,0,0);
			self.scene.add(self.factsObjects[i].dot);

			//white point
			radius = 0.1;
			material = new THREE.MeshBasicMaterial( { color: 0xffffff, side: THREE.DoubleSide} );
			geometry = new THREE.CircleGeometry( radius, self.segmentsForCircle );
			self.factsObjects[i].dotInner = new THREE.Mesh(geometry, material);
			self.factsObjects[i].dotInner.position.set(x,y + 0.05,z);
			self.factsObjects[i].dotInner.rotation.set(1.57,0,0);
			self.scene.add(self.factsObjects[i].dotInner);

			//line
			planeGeometry = new THREE.PlaneGeometry(0.05,dateLineHeigth,1,1);
			self.factsObjects[i].dateLine = new THREE.Mesh(planeGeometry, self.darkColorMaterial);
			self.factsObjects[i].dateLine.rotation.x = Math.PI;
			self.factsObjects[i].dateLine.rotation.z = Math.PI;
			self.factsObjects[i].dateLine.position.x = x;
			self.factsObjects[i].dateLine.position.y = y + dateLineHeigth / 2;
			self.factsObjects[i].dateLine.position.z = z;
			if (i !== 0) {self.factsObjects[i].dateLine.visible = false;}
			self.scene.add(self.factsObjects[i].dateLine);

			//more-round
			colorIndex = self.countries.indexOf(item.country);
			radius = measure * 0.035;
			color =  'rgb(' + self.countriesColors[colorIndex].r + 
						',' + self.countriesColors[colorIndex].g + 
						',' + self.countriesColors[colorIndex].b + ')';
			material = new THREE.MeshBasicMaterial( { color: color, side: THREE.DoubleSide} );
			geometry = new THREE.CircleGeometry( radius, self.segmentsForCircle );
			self.factsObjects[i].moreCircle = new THREE.Mesh(geometry, material);
			if (even && !self.isMobile) {
				self.factsObjects[i].moreCircle.position.set(x - chipsRadius + measure * 0.01,y + dateLineHeigth + chipsRadius,z - 0.02);
			} else {
				self.factsObjects[i].moreCircle.position.set(x + chipsRadius - measure * 0.01,y + dateLineHeigth + chipsRadius,z - 0.02);
			}
			self.scene.add(self.factsObjects[i].moreCircle);
			if (i !== 0) {self.factsObjects[i].moreCircle.visible = false;}

			//function for working with delay functions
			(function(x,y,z, even){
				self.textureLoader = new THREE.TextureLoader();
				var photos = [],
				textSize,
				fontDateOptions,
				text,
				textWidth;

				//pictures
				self.loading['photo' + i] = false;
				self.textureLoader.load(
					item.image,
					function (texture) {
						texture.minFilter = THREE.LinearFilter;
						photos[i] = new THREE.MeshBasicMaterial( {
							map: texture
						 } );
						radius = measure * 0.1;
							geometry = new THREE.CircleGeometry( radius, self.segmentsForCircle );
						self.factsObjects[i].image = new THREE.Mesh(geometry, photos[i]);
						self.factsObjects[i].image.position.set(x,y + dateLineHeigth + chipsRadius,z);
						self.factsObjects[i].image.rotation.y = Math.PI;
						self.scene.add(self.factsObjects[i].image);
						if (i !== 0) {self.factsObjects[i].image.visible = false;}
						self.renderer.render(self.scene, self.camera);
						self.loading['photo' + i] = true;
						window.dispatchEvent(self.loadingComplete);
					}
				);

				//chips
				self.textureLoader.load(
					'img/chips.jpg',
					function (texture) {
						texture.minFilter = THREE.LinearFilter;
						var chipsMaterial = new THREE.MeshBasicMaterial( {
								map: texture,
								color: 0xffffff,
								side: THREE.DoubleSide
							} );
						geometry = new THREE.CircleGeometry( chipsRadius, self.segmentsForCircle );
						self.factsObjects[i].chips = new THREE.Mesh(geometry, chipsMaterial);
						self.factsObjects[i].chips.position.set(x,y + dateLineHeigth + chipsRadius,z + 0.01);
						self.scene.add(self.factsObjects[i].chips);
						if (i !== 0) {self.factsObjects[i].chips.visible = false;}
						self.renderer.render(self.scene, self.camera);
					}
				);

				//texts

				//date text
				colorIndex = self.countries.indexOf(item.country);
				textSize = 40;
					if (self.isMobile && !self.isLandscape) {
						textSize = 30;
					}

				fontDateOptions = {
					'textColor': self.countriesColors[colorIndex],
					'borderColor': self.countriesColors[colorIndex],
					'fontsize' : measure * textSize,
					'fontface' : 'BebasNeueRegular'
				};
				self.scene.add(self.makeTextSprite(item.date, fontDateOptions, 'dateText', self.factsObjects[i], i));

				text = self.factsObjects[i].dateText;
				textWidth = new THREE.Box3().setFromObject(text).getSize().x;

				text.rotation.y = Math.PI;
				text.position.z = z;
				if (self.isMobile && !self.isLandscape) {
					text.position.x = x;
					text.position.y = y + (dateLineHeigth + chipsRadius) + measure * 0.22;
					textSize = 30;
				} else {
					if (even) {
						text.position.x = x - measure * 0.05 - textWidth / 2;
					} else {
						text.position.x = x + measure * 0.05 + textWidth / 2;
					}
					text.position.y = y + (dateLineHeigth + chipsRadius) - measure * 0.135;
				}


				//fact text
				item.description.forEach(function(line, part) {

					fontDateOptions = {
						'textColor': { 'r':0, 'g':0, 'b':0, 'a':1.0 },
						'borderColor': { 'r':0, 'g':0, 'b':0, 'a':1.0 },
						'fontsize' : measure * 5.2,
						'fontface' : 'BebasNeueRegular'
					};

					self.scene.add(self.makeTextSprite(item.description[part], fontDateOptions, 'factText' + part, self.factsObjects[i], i));

					text = self.factsObjects[i]['factText' + part];
					textWidth = new THREE.Box3().setFromObject(text).getSize().x;

					text.position.z = z - 0.02 - part * 0.02;
					text.rotation.y = Math.PI;
					if (self.isMobile && !self.isLandscape) {
						text.position.x = x;
						text.position.y = y + (dateLineHeigth + chipsRadius) + measure * 0.28 + (part * measure * 0.025);
					} else {
						text.position.y = y + (dateLineHeigth + chipsRadius) - measure * 0.01 + (part * measure * 0.025);
						if (even) {
							text.position.x = x - measure * 0.155 - textWidth / 2;
						} else {
							text.position.x = x + measure * 0.155 + textWidth / 2;
						}
					}
				});


				//more-text
				fontDateOptions = {
					'textColor': { 'r':255, 'g':255, 'b':255, 'a':1.0 },
					'borderColor': { 'r':255, 'g':255, 'b':255, 'a':0.0 },
					'backgroundColor': { 'r':255, 'g':255, 'b':255, 'a':0.0 },
					'fontsize' : measure * 5,
					'fontface' : 'BebasNeueRegular'
				};
				self.scene.add(self.makeTextSprite('more', fontDateOptions, 'moreText', self.factsObjects[i], i));

				text = self.factsObjects[i].moreText;
				textWidth = new THREE.Box3().setFromObject(text).getSize().x;

				text.position.z = z - 0.03;
				text.rotation.y = Math.PI;
				if (even && !self.isMobile) {
					text.position.x = x - chipsRadius + measure * 0.01;//x axis
				} else {
					text.position.x = x + chipsRadius - measure * 0.01;//x axis
				}
				text.position.y = y + dateLineHeigth + chipsRadius;//y axis

			}(x,y,z, even));

		});

		//pushing objects into their userdata for raycasting
		self.hoverObjects = [];
		self.factsObjects.forEach(function(item,i){
			self.hoverObjects.push(item.circle);
			item.circle.userData.parent = self.factsObjects[i];
			self.hoverObjects.push(item.moreCircle);
			item.moreCircle.userData.fact = self.facts[i];
			item.moreCircle.userData.fact.color = self.countriesColors[self.countries.indexOf(self.facts[i].country)];
		});

		self.renderer.render(self.scene, self.camera);

		self.loadingfacts = true;
		window.dispatchEvent(self.loadingComplete);
	});
};

Timeline3d.prototype.makeTextSprite = function(message, parameters, objectName, object, factIndex) {
	'use strict';

	if ( parameters === undefined ) {parameters = {};}
	var fontface = parameters.hasOwnProperty('fontface') ? parameters.fontface : 'Arial, Helvetica, sans-serif',
		fontsize = parameters.hasOwnProperty('fontsize') ? parameters.fontsize : 100,
		borderThickness = parameters.hasOwnProperty('borderThickness') ? parameters.borderThickness : 0,
		borderColor = parameters.hasOwnProperty('borderColor') ?parameters.borderColor : { r:0, g:0, b:0, a:0.0 },
		backgroundColor = parameters.hasOwnProperty('backgroundColor') ?parameters.backgroundColor : { r:255, g:255, b:255, a:1.0 },
		textColor = parameters.hasOwnProperty('textColor') ?parameters.textColor : { r:0, g:0, b:0, a:1.0 },
		canvas = document.createElement('canvas'),
		context = canvas.getContext('2d'),
		metrics,
		proportions,
		texture,
		spriteSize,
		spriteMaterial,
		timeLineGeometry;

	context.font = 'Bold ' + fontsize + 'px ' + fontface;
	context.textAlign = 'start';

	metrics = context.measureText( message );
	canvas.width = metrics.width + 5;
	canvas.height = fontsize;
	proportions = canvas.width / canvas.height - 0.1;
	context.font = 'Bold ' + fontsize + 'px ' + fontface;

	context.fillStyle   = 'rgba(' + backgroundColor.r + ',' + backgroundColor.g + ',' + backgroundColor.b + ',' + backgroundColor.a + ')';
	context.strokeStyle = 'rgba(' + borderColor.r + ',' + borderColor.g + ',' + borderColor.b + ',' + borderColor.a + ')';

	context.lineWidth = borderThickness;

	context.fillStyle = 'rgba('+textColor.r+', '+textColor.g+', '+textColor.b+', 1.0)';
	context.fillText( message, borderThickness, fontsize - fontsize / 25);


	texture = new THREE.Texture(canvas);
	texture.minFilter = THREE.LinearFilter;
	texture.needsUpdate = true;
	spriteSize = canvas.width / 200;

	spriteMaterial = new THREE.MeshBasicMaterial( { map: texture, side:THREE.DoubleSide } );
	spriteMaterial.transparent = true;
	timeLineGeometry = new THREE.PlaneGeometry(1,1,1,1);
	object[objectName] = new THREE.Mesh(timeLineGeometry, spriteMaterial);
	object[objectName].scale.set(spriteSize, spriteSize / proportions, 0.1);

	if (factIndex !== 0) {object[objectName].visible = false;}
	return object[objectName];
};

Timeline3d.prototype.hoverReactions = function() {
	'use strict';
	var self = this,
		raycaster = new THREE.Raycaster(),
		mouse = new THREE.Vector2(),
		i;

	self.hoverCalibrate();

	function hideAllOther() {

		self.factsObjects.forEach(function(item){
			var object;
			for (object in item) {
				if (item.hasOwnProperty(object)) {
					if (object !== 'circle' && object !== 'dot' && object !== 'dotInner') {
						item[object].visible = false;
					}
				}
			}
		});
	}

	function render(event) {
		var object,
			intersects;

		raycaster.setFromCamera( mouse, self.camera );
		intersects = raycaster.intersectObjects( self.hoverObjects );

		document.body.style.cursor = 'default';
		for (i = 0; i < intersects.length; i +=1 ) {
			document.body.style.cursor = 'pointer';
			if (intersects[0].object.userData.hasOwnProperty('fact')) {
				if (event.type === 'click') {
					self.popupHandler(intersects[0].object.userData.fact);
				}
			} else {
				hideAllOther();
				for (object in intersects[0].object.userData.parent) {
					if (intersects[0].object.userData.parent.hasOwnProperty(object) && object !== 'circle' && object !== 'dot' && object !== 'dotInner') {
						intersects[0].object.userData.parent[object].visible = true;
					}
				}
			}
		}
		self.renderer.render( self.scene, self.camera );
	}

	function eventHandler( event ) {
		mouse.x = ( ( event.clientX - self.canvasLeftOffset ) / self.canvasWidth ) * 2 - 1;
		mouse.y = - ( ( event.clientY - self.canvasTopOffset ) / self.canvasHeigth ) * 2 + 1;
		render(event);
	}

	self.parentBlock.addEventListener( 'mousemove', eventHandler, false );
	self.parentBlock.addEventListener( 'click', eventHandler, false );
};

Timeline3d.prototype.popupHandler = function(data) {
	'use strict';
	var self = this,
		popup = document.querySelector('.timeline-popup'),
		popupCard = document.querySelector('.timeline-popup__card'),
		popupFrame = document.querySelector('.timeline-popup__frame-color'),
		popupClose = document.querySelector('.timeline-popup__close'),
		popupImage = document.querySelector('.timeline-popup__photo'),
		popupDate = document.querySelector('.timeline-popup__date'),
		popupHeader = document.querySelector('.timeline-popup__header-text'),
		popupInfo = document.querySelector('.timeline-popup__text'),
		fact = data,
		color = data.color;

	popupFrame.style.fill = 'rgb(' + color.r + ',' + color.g + ',' + color.b + ')';
	popupImage.style.backgroundImage = 'url("' + fact.image + '")';
	popupCard.style.backgroundColor = 'rgb(' + color.r + ',' + color.g + ',' + color.b + ')';
	popupDate.innerHTML = fact.date;
	popupHeader.innerHTML = fact.header;
	popupInfo.innerHTML = fact.fullDescription;
	if (color.r === 235 && color.g === 96 && color.b === 29) {//if popup is orange, make close button blue
		popupClose.style.backgroundColor = 'rgb(26,64,150)';
	} else {
		popupClose.style.backgroundColor = '';
	}

	popup.classList.toggle('timeline-popup--active');
	self.timelineContainer.classList.toggle('timeline--blur');
};

Timeline3d.prototype.popupEvents = function() {
	'use strict';
	var self = this,
		popup = document.querySelector('.timeline-popup'),
		popupCard = document.querySelector('.timeline-popup__card'),
		popupClose = document.querySelector('.timeline-popup__close');

	popupClose.addEventListener('click', function() {
		popup.classList.toggle('timeline-popup--active');
		self.timelineContainer.classList.toggle('timeline--blur');
	});

	popup.addEventListener('click', function() {
		popup.classList.toggle('timeline-popup--active');
		self.timelineContainer.classList.toggle('timeline--blur');
	});

	popupCard.addEventListener('click', function(e){
		e.stopPropagation();
	});
};

Timeline3d.prototype.hoverCalibrate = function() {
	'use strict';
	var self = this,
		paddingLeft,
		paddingTop;

	paddingLeft = parseInt(window.getComputedStyle(self.timelineDecor, null).getPropertyValue('padding-left'), 10);
	paddingTop = parseInt(window.getComputedStyle(self.timelineDecor, null).getPropertyValue('padding-top'), 10);
	self.canvasLeftOffset = self.parentBlock.offsetLeft + paddingLeft;
	self.canvasTopOffset = self.parentBlock.offsetTop + paddingTop;
};

Timeline3d.prototype.setCameraPosition = function() {
	'use strict';
	var self = this,
		ratio = self.canvasWidth / self.canvasHeigth;

	function getYposition() {//depend on device ratio
		var x = 0;
		x = (-7 * ratio + 23.3) / 1.21;//Linear function. Got experimentally
		return x;
	}
	function getZposition() {//depend on device ratio
		var z = 0;
		z = (-14 * ratio + 45) / -1.86;//Linear function. Got experimentally
		return z;
	}

	if (self.isMobile) {
		self.camera.position.y = getYposition();
		self.camera.position.z = self.zInitialPoint = getZposition();
	} else {
		self.camera.position.y = 5.2;
		self.camera.position.z = self.zInitialPoint = -6.3;
	}
	self.camera.position.x = 0;
	self.camera.rotation.y = Math.PI;
	self.camera.rotation.x = 0.15 * Math.PI;
};

Timeline3d.prototype.cameraSettings = function() {
	'use strict';
	var self = this,
		zStartPoint,
		touchSensitivity = 20;//divider of sensitivity

	self.setCameraPosition();
	self.canvasWrap.appendChild(self.renderer.domElement);

	this.mc = new Hammer(self.timelineDecor);
	self.parentBlock.style.touchAction = 'none';

	self.mc.on('panstart', function() {
		zStartPoint = self.camera.position.z;
	});

	self.mc.on('panmove', function(ev) {
		self.camera.position.z = self.zPoint = zStartPoint + ev.deltaY / touchSensitivity;

		if (self.countriesTextWidth !== undefined) {
			self.countriesTextWidth.forEach(function(item, i){
				self.countriesTextes[i].country.position.z = self.camera.position.z - self.zInitialPoint + self.zOffsetByHeight - item / 2;
			});
		}

		self.renderer.render(self.scene, self.camera);
	});

	self.mc.on('panend', function(ev) {
		self.camera.position.z = self.zPoint = zStartPoint + ev.deltaY / touchSensitivity;
		zStartPoint = self.camera.position.z;

		self.endOfTimeLineCheck(self.zPoint);

		if (self.countriesTextWidth !== undefined) {
			self.countriesTextWidth.forEach(function(item, i){
				self.countriesTextes[i].country.position.z = self.camera.position.z - self.zInitialPoint + self.zOffsetByHeight - item / 2;
			});
		}

		if (ev.deltaTime < 300) {
			self.moveCameraSmothTo(self.camera.position.z + ev.overallVelocityY * 15);
			self.endOfTimeLineCheck(self.camera.position.z + ev.overallVelocityY * 15);
		}
		self.setTimePosition();
	});


	function mousewheel( e ) {
		var delta = e.detail < 0 || e.wheelDelta > 0 ? 1 : -1;
		if (delta < 0) {
			self.zPoint += self.dateGapLength / 2;
		} else {
			self.zPoint -= self.dateGapLength / 2;
		}
		self.moveCameraSmothTo(self.zPoint);
		self.endOfTimeLineCheck(self.zPoint);
	}

	self.parentBlock.addEventListener( 'mousewheel', mousewheel, false );
	self.parentBlock.addEventListener( 'DOMMouseScroll', mousewheel, false ); // firefox

	self.zPoint = self.camera.position.z;
};

Timeline3d.prototype.disableScroll = function() {
	'use strict';
	var self = this,
		keys = {37: 1, 38: 1, 39: 1, 40: 1};

	function preventDefault(e) {
		e = e || window.event;
		if (e.preventDefault) {e.preventDefault();}
		e.returnValue = false;
	}

	function preventDefaultForScrollKeys(e) {
		if (keys[e.keyCode]) {
			preventDefault(e);
			return false;
		}
	}

	function disableScroll() {
		if (window.addEventListener){window.addEventListener('DOMMouseScroll', preventDefault, false);}
		window.onwheel = preventDefault; // modern standard
		window.onmousewheel = document.onmousewheel = preventDefault; // older browsers, IE
		window.ontouchmove  = preventDefault; // mobile
		document.onkeydown  = preventDefaultForScrollKeys;
	}

	function enableScroll() {
		if (window.removeEventListener) {window.removeEventListener('DOMMouseScroll', preventDefault, false);}
		window.onmousewheel = document.onmousewheel = null;
		window.onwheel = null;
		window.ontouchmove = null;
		document.onkeydown = null;
	}

	window.addEventListener('mouseover', function() {
		enableScroll();
	});

	window.addEventListener('touchstart', function() {
		enableScroll();
	});

	//self.timelineDecor.addEventListener('mouseover', function(ev){
	//	ev.stopPropagation();
	//	disableScroll();
	//});

	self.timelineDecor.addEventListener('touchstart', function(ev){
		ev.stopPropagation();
		disableScroll();
	});

	self.timelineStrips.addEventListener('mouseover', function(ev){
		ev.stopPropagation();
		disableScroll();
	});

	self.timelineStrips.addEventListener('touchstart', function(ev){
		ev.stopPropagation();
		disableScroll();
	});
};

Timeline3d.prototype.moveCameraSmothTo = function(point) {
	'use strict';
	var self = this,
		tweenParams = { z:self.camera.position.z },
		tweenObject = { z: point };

	if (self.countriesTextWidth !== undefined) {

		self.countriesTextWidth.forEach(function(item, i){
			tweenParams["z" + i] = self.camera.position.z - self.zInitialPoint + self.zOffsetByHeight - item / 2;
			tweenObject["z" + i] = point - self.zInitialPoint + self.zOffsetByHeight - item / 2;
		});

		self.tween = new TWEEN.Tween(tweenParams)
			.onUpdate(function() {
				self.camera.position.z = this.z;

				var that = this;
				self.countriesTextes.forEach(function(item, i){
					item.country.position.z = that['z' + i];
				});

			}).start().to(tweenObject,300).start();
			
	} else {
		self.tween = new TWEEN.Tween(tweenParams)
			.onUpdate(function() {
				self.camera.position.z = this.z;
			}).start().to(tweenObject,300).start();
	}

	if (typeof self.instanceId !== 'number') {self.instanceId = 0;}

	function animate(instanceId) {
		var currentInstanceId = instanceId;

		if (currentInstanceId === self.instanceId) {
			if (point !== self.camera.position.z) {
				window.requestAnimationFrame(function() {animate(currentInstanceId);});
				TWEEN.update();
				self.renderer.render(self.scene, self.camera);
			} else {
				self.zPoint = self.camera.position.z;
				self.setTimePosition();
			}
		}
	}
	window.requestAnimationFrame(function() {animate(self.instanceId);});

	self.instanceId +=1;
};

Timeline3d.prototype.lineWidth = function() {
	'use strict';
	return 0.15;
};

Timeline3d.prototype.dateTextSize = function() {
	'use strict';
	var self = this,
		textSize = (-0.3 * self.camera.position.y - 1.67) / -10.8;//Linear function. Got experimentally
	return textSize;
};

Timeline3d.prototype.dateTextSize = function() {
	'use strict';
	var self = this;

	self.parentBlock.classList.add('timeline--loading-markup');
	self.parentBlock.classList.add('timeline--loading-data');
	self.loadingComplete = new Event('loadingComplete');
	self.loading = {};//object for loading detecting
	window.addEventListener('loadingComplete', function() {
		self.parentBlock.classList.add('timeline--loading-data');
		if(self.loading.panel && self.loading.lines){
			self.parentBlock.classList.remove('timeline--loading-markup');
		}

		var el,
			i = 0,
			length = Object.keys(self.loading).length;
		for(el in self.loading) {
			if (self.loading.hasOwnProperty(el)) {
				if (!self.loading[el]) {break;}
				i += 1;
				if (i === length) {// true if last, false if not last
					self.parentBlock.classList.remove('timeline--loading-data');
				}
			}
		}
	});
};

Timeline3d.prototype.endOfTimeLineCheck = function(currentPosition) {
	'use strict';
	var self = this,
		firstPoint = self.zInitialPoint,
		lastPoint = (self.dates.length - 1) * self.dateGapLength + self.zInitialPoint;

	if (currentPosition > lastPoint) {
		setTimeout(function(){self.moveCameraSmothTo(lastPoint);},300);
	}
	if (currentPosition < firstPoint) {
		setTimeout(function(){self.moveCameraSmothTo(firstPoint);},300);
	}
};