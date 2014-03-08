module.exports = function(grunt) {
	//Boot
	var bootIncludes = grunt.file.readJSON('etc/boot-includes.json'), bootIncludesList = [];
	for (var filepath in bootIncludes) {
		bootIncludesList.push('./'+filepath);
	}

	//UIs
	var uisConcat = {}, uisJsUglify = [], uisCssUglify = [];
	if (grunt.file.isDir('dist/boot/uis')) {
		var uisList = grunt.file.expand({
			cwd: 'dist/boot/uis/',
			filter: 'isDirectory'
		}, '*');

		for (var i = 0; i < uisList.length; i++) {
			var uiName = uisList[i];
			var rootPath = 'dist/boot/uis/'+uiName;

			if (!grunt.file.exists(rootPath+'/config.json')) {
				continue;
			}

			var uiMetadata = grunt.file.readJSON(rootPath+'/config.json');

			var deps = uiMetadata.userinterface.includes[0].file,
				jsDepsList = [],
				cssDepsList = [];
			for (var j = 0; j < deps.length; j++) {
				var filePath = deps[j].path[0];

				if (/\.js$/.test(filePath)) {
					jsDepsList.push('./'+filePath);
				} else if (/\.css$/.test(filePath)) {
					cssDepsList.push('./'+filePath);
				}
			}

			jsDepsList.push('boot/uis/'+uiName+'/index.js');

			var jsPath = 'build/boot/uis/'+uiName+'/main.min.js',
				cssPath = 'build/boot/uis/'+uiName+'/style.min.css';

			uisConcat[jsPath] = jsDepsList;
			uisConcat[cssPath] = cssDepsList;

			uisJsUglify.push({
				src: jsPath,
				dest: jsPath
			});
			uisCssUglify.push({
				src: cssPath,
				dest: cssPath
			});
		}
	}

	//Themes
	var themesConcat = {}, themesUglify = [];
	var themesList = grunt.file.expand({
		cwd: 'usr/share/css/themes/',
		filter: 'isDirectory'
	}, '*');
	for (var i = 0; i < themesList.length; i++) {
		var themeName = themesList[i];
		var rootPath = 'usr/share/css/themes/'+themeName;

		var basicFiles = grunt.file.expand(rootPath+'/*.css');

		var supportedUis = grunt.file.expand({
			cwd: rootPath,
			filter: 'isDirectory'
		}, '*');

		for (var j = 0; j < supportedUis.length; j++) {
			var uiName = supportedUis[j];

			var uisFiles = grunt.file.expand(rootPath+'/'+uiName+'/*.css');

			var cssPath = 'build/usr/share/css/themes/'+themeName+'/'+uiName+'/main.min.css';

			themesConcat[cssPath] = basicFiles.concat(uisFiles);
			themesUglify.push({
				src: jsPath,
				dest: jsPath
			});
		}
	}

	//TODO: minify CSS

	// Project configuration.
	grunt.initConfig({
		pkg: grunt.file.readJSON('package.json'),
		jshint: {
			// define the files to lint
			files: ['boot/lib/**/*.js'],
			options: {
				globals: {
					jQuery: true,
					console: true,
					module: false
				}
			}
		},
		clean: {
			tmp: {
				src: ['tmp/**/*']
			}
		},
		convert: {
			uis: {
				files: [
					{
						expand: true,
						src: 'boot/uis/**/*.xml',
						dest: 'dist/',
						ext: '.json'
					}
				]
			},
			applications: {
				options: {
					explicitRoot: false,
					mergeAttrs: true
				},
				files: [
					{
						expand: true,
						src: 'usr/share/applications/*.xml',
						dest: 'dist/',
						ext: '.json'
					}
				]
			},
			categories: {
				options: {
					explicitRoot: false,
					mergeAttrs: true
				},
				files: [
					{
						expand: true,
						src: 'usr/share/categories/*.xml',
						dest: 'dist/',
						ext: '.json'
					}
				]
			}
		},
		concat: {
			dist: {
				options: {
					separator: ';\n'
				},
				files: {
					'dist/boot/boot.js': bootIncludesList
				}
			},
			build: {
				options: {
					separator: ';\n'
				},
				files: {
					'build/boot/boot.min.js': bootIncludesList
				}
			},
			uis: {
				options: {
					separator: ';\n'
				},
				files: uisConcat
			},
			themes: {
				options: {
					process: function (src, filepath) {
						return '/*! ' + filepath + ' */\n' + src;
					}
				},
				files: themesConcat
			}
		},
		uglify: {
			build: {
				options: {
					banner: '/*! <%= pkg.name %> <%= pkg.version %> <%= grunt.template.today("yyyy-mm-dd") %> */\n'
				},
				files: [
					{
						src: ['dist/boot/boot.js'],
						dest: 'build/boot/boot.min.js'
					}
				]
			},
			uis: {
				files: uisJsUglify
			}
		},
		copy: {
			index: {
				files: [
					{src: ['boot/includes/index.html'], dest: 'build/index.html'}
				]
			},
			uis: {
				files: [
					{expand: true, src: ['boot/uis/**'], dest: 'build/'},
					{src: ['etc/uis.json'], dest: 'build/'}
				]
			},
			usr: {
				files: [
					{expand: true, src: ['usr/**'], dest: 'build/'}
				]
			},
			ske1: {
				files: [
					{expand: true, dot: true, src: ['etc/ske1/**'], dest: 'build/'}
				]
			}
		},
		watch: {
			files: ['<%= jshint.files %>'],
			tasks: ['jshint']
		}
	});

	// Load the plugin that provides the "uglify" task.
	grunt.loadNpmTasks('grunt-contrib-clean');
	grunt.loadNpmTasks('grunt-contrib-uglify');
	grunt.loadNpmTasks('grunt-contrib-jshint');
	grunt.loadNpmTasks('grunt-contrib-watch');
	grunt.loadNpmTasks('grunt-contrib-concat');
	grunt.loadNpmTasks('grunt-contrib-copy');
	grunt.loadNpmTasks('grunt-convert');


	grunt.registerTask('formatlaunchers', 'Re-format properly launchers.', function(type) {
		var type = (type || 'applications'),
			rootPath = 'dist/usr/share/'+type+'/';

		var itemsList = grunt.file.expand({
			cwd: rootPath
		}, '*.json');

		var items = {};

		for (var i = 0; i < itemsList.length; i++) {
			var itemName = itemsList[i];
			var itemPath = rootPath+'/'+itemName;

			var itemData = grunt.file.readJSON(itemPath)['attribute'], item = {};
			for (var j = 0; j < itemData.length; j++) {
				var attr = itemData[j],
					attrName = (attr.name || [])[0],
					attrLang = (attr.lang || [])[0],
					attrValue = (attr.value || [])[0];

				if (attrLang) {
					if (!item[attrLang]) {
						item[attrLang] = {};
					}

					item[attrLang][attrName] = attrValue;
				} else {
					item[attrName] = attrValue;
				}
			}

			if (!item.name) {
				item.name = itemName.substr(0, itemName.lastIndexOf('.'));
			}

			items[item.name] = item;
			grunt.file.write(itemPath, JSON.stringify(item));
		}

		grunt.file.write('build/usr/share/'+type+'.json', JSON.stringify(items));
	});

	grunt.registerTask('convertuis', [
		'convert:uis'
	]);

	grunt.registerTask('convertapps', [
		'convert:categories',
		'convert:applications',
		'formatlaunchers:categories',
		'formatlaunchers:applications'
	]);


	grunt.registerTask('default', [
		//'jshint',
		'clean',
		'concat:dist',
		'concat:uis',
		'concat:themes',
		'copy:index',
		'copy:uis',
		'copy:usr',
		'copy:ske1',
		'convertuis',
		'convertapps',
		'uglify:build',
		'uglify:uis'
	]);

	grunt.registerTask('quickbuild', [
		//'jshint',
		//'clean',
		'concat:build',
		'concat:uis',
		//'concat:themes',
		//'copy:index',
		//'copy:uis',
		//'copy:usr',
		//'copy:ske1',
	]);
};