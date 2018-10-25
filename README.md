# gulp-inline-temp

## gulp
```
var inline = require('gulp-inline-temp')
gulp.task('views', () => {
	gulp.src('./a.html')
        .pipe(inline())
		.pipe(gulp.dest("dist"))
})

```

## Example
### html
a.html
```
<div>
	<link type="import" href="./b.html" />
</div>
```
b.html
```
<p>this is b.html</p>
```
Output
```
<div>
	<p>this is b.html</p>
</div>
```

### js
a.js
```
__inline("./b.js")
```
b.js
```
console.log("this is b.js")
```
Output
```
console.log("this is b.js")
```