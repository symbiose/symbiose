module.exports = function(grunt) {
	// Project configuration.
	grunt.initConfig({
		pkg: grunt.file.readJSON('package.json'),
		jshint: {
			boot: {
				// define the files to lint
				src: ['boot/lib/**/*.js', '!boot/lib/**/*.min.js'],
				options: {
					globals: {
						jQuery: true,
						console: true,
						module: false
					}
				}
			},
			usr: {
				src: ['usr/**/*.js', '!usr/**/*.min.js'],
				options: {
					globals: {
						jQuery: true,
						console: true,
						module: false
					}
				}
			}
		},
		clean: {
			tmp: {
				src: ['tmp/**/*']
			}
		},
		convert: {
			ui: {
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
		uglify: {
			boot: {
				options: {
					banner: '/*! <%= pkg.name %> <%= pkg.version %> <%= grunt.template.today("yyyy-mm-dd") %> */\n'
				},
				files: [
					{
						src: ['build/boot/boot.min.js'],
						dest: 'build/boot/boot.min.js'
					}
				]
			}
		},
		copy: {
			//Build
			build: {
				files: [
					{src: 'boot/includes/index-built.html', dest: 'build/index.php'},
					{
						expand: true,
						dot: true,
						src: ['boot/**', 'etc/**', 'home/**', 'lib/**', 'sbin/**', 'usr/**', 'var/**'],
						dest: 'build/'
					},
					{src: [/*'index.php',*/ 'README.md', 'COPYING', '.htaccess'], dest: 'build/'}
				]
			},

			//Standalone
			standalone: {
				files: [
					{src: ['boot/includes/index-standalone.html'], dest: 'build/index.html'},
					{
						expand: true,
						dot: true,
						src: ['boot/uis/**', 'usr/**', 'etc/ske1/**', 'etc/uis.json', 'README.md', 'COPYING'],
						dest: 'build/'
					}
				]
			}
		},
		watch: {
			files: ['<%= jshint.files %>'],
			tasks: ['jshint']
		}
	});

	grunt.loadNpmTasks('grunt-contrib-clean');
	grunt.loadNpmTasks('grunt-contrib-uglify');
	grunt.loadNpmTasks('grunt-contrib-jshint');
	//grunt.loadNpmTasks('grunt-contrib-qunit');
	grunt.loadNpmTasks('grunt-contrib-cssmin');
	grunt.loadNpmTasks('grunt-contrib-watch');
	grunt.loadNpmTasks('grunt-contrib-concat');
	grunt.loadNpmTasks('grunt-contrib-copy');
	grunt.loadNpmTasks('grunt-convert');

	grunt.registerTask('gen-boot', 'Concatenate boot files.', function() {
		var bootIncludes = grunt.file.readJSON('etc/boot-includes.json'), bootIncludesList = [];
		for (var filepath in bootIncludes) {
			bootIncludesList.push('./'+filepath);
		}

		grunt.config('concat.boot', {
			options: {
				separator: ';\n'
			},
			files: {
				'build/boot/boot.min.js': bootIncludesList
			}
		});

		grunt.task.run('concat:boot');
		grunt.task.run('uglify:boot');
	});

	grunt.registerTask('gen-ui', 'Concatenate UI files.', function() {
		var uisConcat = {}, uisJsUglify = [], uisCssMinify = [];
		
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
			uisCssMinify.push({
				src: cssPath,
				dest: cssPath
			});
		}

		grunt.config('concat.ui', {
			options: {
				separator: ';\n'
			},
			files: uisConcat
		});
		grunt.config('uglify.ui', {
			files: uisJsUglify
		});
		grunt.config('cssmin.ui', {
			files: uisCssMinify
		});

		grunt.task.run('concat:ui');
		grunt.task.run('uglify:ui');
		grunt.task.run('cssmin:ui');
	});

	grunt.registerTask('gen-theme', 'Concatenate theme files.', function() {
		var themesConcat = {}, themesMinify = [];
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
				themesMinify.push({
					src: cssPath,
					dest: cssPath
				});
			}
		}

		grunt.config('concat.theme', {
			options: {
				process: function (src, filepath) {
					return '/*! ' + filepath + ' */\n' + src;
				}
			},
			files: themesConcat
		});
		grunt.config('cssmin.theme', {
			files: themesMinify
		});

		grunt.task.run('concat:theme');
		grunt.task.run('cssmin:theme');
	});

	grunt.registerTask('gen-launcher', 'Concatenate launchers.', function(type) {
		type = (type || 'applications');
		var rootPath = 'dist/usr/share/'+type+'/';

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

	grunt.registerTask('gen-icon', 'Build icon themes index files.', function() {
		var rootPath = 'usr/share/icons/';

		var items = grunt.file.expand({
			cwd: rootPath
		}, '**/*.{png,svg}');

		grunt.file.write('build/usr/share/icons/index.json', JSON.stringify(items));
	});

	grunt.registerTask('convert-launcher', 'Convert launchers.', [
		'convert:categories',
		'convert:applications',
		'gen-launcher:categories',
		'gen-launcher:applications'
	]);

	grunt.registerTask('standalone', 'Build a standalone version of the web desktop.', [
		'clean',
		'convert:ui',
		'gen-boot',
		'gen-ui',
		'gen-theme',
		'gen-icon',
		'copy:standalone',
		'convert-launcher'
	]);

	grunt.registerTask('build', 'Build the web desktop.', [
		'clean',
		'gen-boot',
		'gen-ui',
		'gen-theme',
		'copy:build'

		//Useless tasks here: the webos API is used instead for now
		//'convert-ui',
		//'convert-launcher',
		//'gen-icon'
	]);

	//TODO
	grunt.registerTask('test', 'Run tests.', []);

	//TODO: outdated
	/*grunt.registerTask('quickbuild', 'Quickly re-build the web desktop.', [
		//'jshint',
		//'clean',
		'concat:build',
		'concat:uis',
		//'concat:themes',
		//'copy:index',
		//'copy:uis',
		//'copy:usr',
		//'copy:ske1',
	]);*/

	grunt.registerTask('default', ['build']);
};