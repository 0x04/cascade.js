module.exports = function(grunt)
{
  var pkg = grunt.file.readJSON('package.json');
  // Project configuration.
  grunt.initConfig({
    pkg: pkg,
    uglify: {
      options: {
        banner: '/**\n'
          + ' * cascade.js'
          + ' * @creator Oliver Kühn\n'
          + ' * @website http://0x04.de\n'
          + ' * @version ' + pkg.version + '\n'
          + ' * @license MIT\n'
          + ' */\n'
      },
      build: {
        src: 'src/<%= pkg.name %>',
        dest: 'build/cascade.min.js'
      }
    }
  });

  // Load the plugin that provides the "uglify" task.
  grunt.loadNpmTasks('grunt-contrib-uglify');

  // Defaults task(s)
  grunt.registerTask('default', [ 'uglify' ]);

};