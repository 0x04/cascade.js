module.exports = function(grunt)
{

  // Project configuration.
  grunt.initConfig({
    pkg: grunt.file.readJSON('package.json'),
    uglify: {
      options: {
        banner: '/**\n'
          + ' * cascade.js'
          + ' * @creator Oliver Kühn\n'
          + ' * @website http://0x04.de\n'
          + ' * @version 0.6.6\n'
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