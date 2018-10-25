var Transform = require('readable-stream/transform');
var fs = require('fs');
var path = require('path');

function inline(){
	var _ = {
		//根据路径获取文件类型
		getType: function(path) {
	        var _type_temp = path.split('.');
	        return _type_temp[_type_temp.length - 1];
	    },
	    //根据路径获取文件名
	    getName: function(path) {
	        path = _.pathFix(path);
	        var _name_temp = path.split('/');
	        return _name_temp[_name_temp.length - 1].replace(/'|"/g, '');
	    },
	    // 获取文件路径
	    getPath: function(path){
	      var paths = path.split('/');
	      paths.pop()
	      return paths.join('/')
	    },
	    // 统一路径格式
	    pathFix: function(paths){
	      return paths.replace(/\\/g, '/')
	    },
	    // 获取插入片段的内容
	    getContent: function(path1, path2, name){
	      var addr = path.join(_.getPath(_.pathFix(path1)), _.getPath(_.pathFix(path2)), name);
	      var data = '';
	      
	      if(fs.existsSync(addr)){
	        data = fs.readFileSync(addr, 'utf-8');
	      }
	      return data
	    },
	    // 替换多余的"'。
	    pathTrim: function(content){
	      return content.replace(/^['"]|['"]$/g, '')
	    }
	};
	var reg = {
	    main : /(<script(?:(?=\s)[\s\S]*?["'\s\w\/\-]>|>))([\s\S]*?)(?=<\/script\s*>|$)|(<style(?:(?=\s)[\s\S]*?["'\s\w\/\-]>|>))([\s\S]*?)(?=<\/style\s*>|$)|<(link)\s+[\s\S]*?["'\s\w\/\-](?:>|$)|<!--inline\[([^\]]+)\]-->|(<!(?:--)?\[[^>]+>)|<!--(?!\[|>)([\s\S]*?)(-->|$)|\bstyle\s*=\s*("(?:[^\\"\r\n\f]|\\[\s\S])+"|'(?:[^\\'\n\r\f]|\\[\s\S])+')|(__inline\(.*\))/ig,
	    script : /(<script(?:(?=\s)[\s\S]*?["'\s\w\/\-]>|>))/ig,
	    style : /(<style(?:(?=\s)[\s\S]*?["'\s\w\/\-]>|>))([\s\S]*?)(?=<\/style\s*>|$)/ig,
	    link : /((<link)\s+[\s\S]*?["'\s\w\/\-](?:>|$))/i,
	    inline : /(__inline\(.*\))/ig,
	    rel : /\srel\s*=\s*('[^']+'|"[^"]+"|[^\s\/>]+)/i,
	    href : /\bhref\s*=\s*"([^"]*)"/i,
	    type : /\stype\s*=\s*('[^']+'|"[^"]+"|[^\s\/>]+)/i,
	    src : /\ssrc\s*=\s*('[^']+'|"[^"]+"|[^\s\/>]+)/i,
	};

	return new Transform({
		objectMode : true,
		transform : function(file, enc, callback){

			if(file.isNull()){
				return callback(null, file)
			};

			if(file.isBuffer()){

				// 获取文件后缀名
        		var type = _.getType(file.path);

        		// 获取文件名称
        		var fileName = _.getName(file.path);

        		// buffer对象转字符
        		var result = String(file.contents);

        		function replaceFn(m, $1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11){
        			var target = '';
        			var curPath = '';
        			var copy = m;

        			if($1){ // script
        				target = '$1';
        				var script = m.match(reg.type);
        				if(script && script[1]){
        					var type = _.pathTrim(script[1]).toLowerCase();
        					if(type == 'import'){
        						curPath = _.pathTrim(script.input.match(reg.src)[1]);
        					}
        				}
        			}else if($3){ // style
        				target = '$3';
        				var style = m.match(reg.rel);
        				if(style && style[1]){
        					var rel = _.pathTrim(style[1]).toLowerCase();
        					if(rel == 'import'){
        						curPath = _.pathTrim(style.input.match(reg.href)[1]);
        					}
        				}
        			}else if($5){ // link
        				target = '$5';
        				var link = m.match(reg.rel);
        				if(link && link[1]){
        					var rel = _.pathTrim(link[1]).toLowerCase();
        					if(rel === 'import'){
        						curPath = link.input.match(reg.href)[1];
        					}
        				}
        			}else if($11){ // __inline
        				target = '$11';
        				var inline = $11.replace(/__inline\(\s*['"]|['"]\s*\)$/g, '').toLowerCase();
        				curPath = inline;
        			};

        			if(curPath){
        				var curName = _.getName(curPath);
            			var data = _.getContent(file.path, curPath, curName)

            			switch(target){
            				case '$1':
                				m = '<script type="text/javascript" >' + data;
                				break;
			              	case '$3':
			                	m = '\n<style>\n' + data + '\n';
			                	break;
			              	case '$5':
			                	m = '\n' + data + '\n';
			                	break;
			              	case '$11':
			                	m = data;
			                	break;
            			}
        			};

        			
        			if(data && copy !== data){
        				m = data.replace(reg.main, replaceFn);
        			}

        			return m;
        		};

        		result = result.replace(reg.main, replaceFn);

		        file.contents = new Buffer(result);

		        return callback(null, file);

			};

			callback(null, file);
		}

	});
};

module.exports = inline;