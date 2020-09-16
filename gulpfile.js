const gulp = require('gulp')

gulp.task('copylib', () => {
    return gulp.src('./lib/**')
            .pipe(gulp.dest('./dist/lib'))

})

gulp.task('copyimages', () => {
    return gulp.src('./images/**')
            .pipe(gulp.dest('./dist/images'))

})

gulp.task('build_clean', gulp.series('copylib', 'copyimages'))

gulp.task('build', gulp.parallel('build_clean'))