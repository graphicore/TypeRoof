
var Module = (() => {
  var _scriptDir = typeof document !== 'undefined' && document.currentScript ? document.currentScript.src : undefined;
  if (typeof __filename !== 'undefined') _scriptDir ||= __filename;
  return (
function(moduleArg = {}) {

var Module=moduleArg;var readyPromiseResolve,readyPromiseReject;Module["ready"]=new Promise((resolve,reject)=>{readyPromiseResolve=resolve;readyPromiseReject=reject});var moduleOverrides=Object.assign({},Module);var arguments_=[];var thisProgram="./this.program";var quit_=(status,toThrow)=>{throw toThrow};var ENVIRONMENT_IS_WEB=typeof window=="object";var ENVIRONMENT_IS_WORKER=typeof importScripts=="function";var ENVIRONMENT_IS_NODE=typeof process=="object"&&typeof process.versions=="object"&&typeof process.versions.node=="string";var scriptDirectory="";function locateFile(path){if(Module["locateFile"]){return Module["locateFile"](path,scriptDirectory)}return scriptDirectory+path}var read_,readAsync,readBinary;if(ENVIRONMENT_IS_NODE){var fs=require("fs");var nodePath=require("path");if(ENVIRONMENT_IS_WORKER){scriptDirectory=nodePath.dirname(scriptDirectory)+"/"}else{scriptDirectory=__dirname+"/"}read_=(filename,binary)=>{filename=isFileURI(filename)?new URL(filename):nodePath.normalize(filename);return fs.readFileSync(filename,binary?undefined:"utf8")};readBinary=filename=>{var ret=read_(filename,true);if(!ret.buffer){ret=new Uint8Array(ret)}return ret};readAsync=(filename,onload,onerror,binary=true)=>{filename=isFileURI(filename)?new URL(filename):nodePath.normalize(filename);fs.readFile(filename,binary?undefined:"utf8",(err,data)=>{if(err)onerror(err);else onload(binary?data.buffer:data)})};if(!Module["thisProgram"]&&process.argv.length>1){thisProgram=process.argv[1].replace(/\\/g,"/")}arguments_=process.argv.slice(2);quit_=(status,toThrow)=>{process.exitCode=status;throw toThrow}}else if(ENVIRONMENT_IS_WEB||ENVIRONMENT_IS_WORKER){if(ENVIRONMENT_IS_WORKER){scriptDirectory=self.location.href}else if(typeof document!="undefined"&&document.currentScript){scriptDirectory=document.currentScript.src}if(_scriptDir){scriptDirectory=_scriptDir}if(scriptDirectory.startsWith("blob:")){scriptDirectory=""}else{scriptDirectory=scriptDirectory.substr(0,scriptDirectory.replace(/[?#].*/,"").lastIndexOf("/")+1)}{read_=url=>{var xhr=new XMLHttpRequest;xhr.open("GET",url,false);xhr.send(null);return xhr.responseText};if(ENVIRONMENT_IS_WORKER){readBinary=url=>{var xhr=new XMLHttpRequest;xhr.open("GET",url,false);xhr.responseType="arraybuffer";xhr.send(null);return new Uint8Array(xhr.response)}}readAsync=(url,onload,onerror)=>{var xhr=new XMLHttpRequest;xhr.open("GET",url,true);xhr.responseType="arraybuffer";xhr.onload=()=>{if(xhr.status==200||xhr.status==0&&xhr.response){onload(xhr.response);return}onerror()};xhr.onerror=onerror;xhr.send(null)}}}else{}var out=Module["print"]||console.log.bind(console);var err=Module["printErr"]||console.error.bind(console);Object.assign(Module,moduleOverrides);moduleOverrides=null;if(Module["arguments"])arguments_=Module["arguments"];if(Module["thisProgram"])thisProgram=Module["thisProgram"];if(Module["quit"])quit_=Module["quit"];var wasmBinary;if(Module["wasmBinary"])wasmBinary=Module["wasmBinary"];var wasmMemory;var ABORT=false;var EXITSTATUS;var HEAP8,HEAPU8,HEAP16,HEAPU16,HEAP32,HEAPU32,HEAPF32,HEAPF64;function updateMemoryViews(){var b=wasmMemory.buffer;Module["HEAP8"]=HEAP8=new Int8Array(b);Module["HEAP16"]=HEAP16=new Int16Array(b);Module["HEAPU8"]=HEAPU8=new Uint8Array(b);Module["HEAPU16"]=HEAPU16=new Uint16Array(b);Module["HEAP32"]=HEAP32=new Int32Array(b);Module["HEAPU32"]=HEAPU32=new Uint32Array(b);Module["HEAPF32"]=HEAPF32=new Float32Array(b);Module["HEAPF64"]=HEAPF64=new Float64Array(b)}var __ATPRERUN__=[];var __ATINIT__=[];var __ATPOSTRUN__=[];var runtimeInitialized=false;function preRun(){if(Module["preRun"]){if(typeof Module["preRun"]=="function")Module["preRun"]=[Module["preRun"]];while(Module["preRun"].length){addOnPreRun(Module["preRun"].shift())}}callRuntimeCallbacks(__ATPRERUN__)}function initRuntime(){runtimeInitialized=true;callRuntimeCallbacks(__ATINIT__)}function postRun(){if(Module["postRun"]){if(typeof Module["postRun"]=="function")Module["postRun"]=[Module["postRun"]];while(Module["postRun"].length){addOnPostRun(Module["postRun"].shift())}}callRuntimeCallbacks(__ATPOSTRUN__)}function addOnPreRun(cb){__ATPRERUN__.unshift(cb)}function addOnInit(cb){__ATINIT__.unshift(cb)}function addOnPostRun(cb){__ATPOSTRUN__.unshift(cb)}var runDependencies=0;var runDependencyWatcher=null;var dependenciesFulfilled=null;function addRunDependency(id){runDependencies++;Module["monitorRunDependencies"]?.(runDependencies)}function removeRunDependency(id){runDependencies--;Module["monitorRunDependencies"]?.(runDependencies);if(runDependencies==0){if(runDependencyWatcher!==null){clearInterval(runDependencyWatcher);runDependencyWatcher=null}if(dependenciesFulfilled){var callback=dependenciesFulfilled;dependenciesFulfilled=null;callback()}}}function abort(what){Module["onAbort"]?.(what);what="Aborted("+what+")";err(what);ABORT=true;EXITSTATUS=1;what+=". Build with -sASSERTIONS for more info.";var e=new WebAssembly.RuntimeError(what);readyPromiseReject(e);throw e}var dataURIPrefix="data:application/octet-stream;base64,";var isDataURI=filename=>filename.startsWith(dataURIPrefix);var isFileURI=filename=>filename.startsWith("file://");var wasmBinaryFile;wasmBinaryFile="hb.wasm";if(!isDataURI(wasmBinaryFile)){wasmBinaryFile=locateFile(wasmBinaryFile)}function getBinarySync(file){if(file==wasmBinaryFile&&wasmBinary){return new Uint8Array(wasmBinary)}if(readBinary){return readBinary(file)}throw"both async and sync fetching of the wasm failed"}function getBinaryPromise(binaryFile){if(!wasmBinary&&(ENVIRONMENT_IS_WEB||ENVIRONMENT_IS_WORKER)){if(typeof fetch=="function"&&!isFileURI(binaryFile)){return fetch(binaryFile,{credentials:"same-origin"}).then(response=>{if(!response["ok"]){throw`failed to load wasm binary file at '${binaryFile}'`}return response["arrayBuffer"]()}).catch(()=>getBinarySync(binaryFile))}else if(readAsync){return new Promise((resolve,reject)=>{readAsync(binaryFile,response=>resolve(new Uint8Array(response)),reject)})}}return Promise.resolve().then(()=>getBinarySync(binaryFile))}function instantiateArrayBuffer(binaryFile,imports,receiver){return getBinaryPromise(binaryFile).then(binary=>WebAssembly.instantiate(binary,imports)).then(receiver,reason=>{err(`failed to asynchronously prepare wasm: ${reason}`);abort(reason)})}function instantiateAsync(binary,binaryFile,imports,callback){if(!binary&&typeof WebAssembly.instantiateStreaming=="function"&&!isDataURI(binaryFile)&&!isFileURI(binaryFile)&&!ENVIRONMENT_IS_NODE&&typeof fetch=="function"){return fetch(binaryFile,{credentials:"same-origin"}).then(response=>{var result=WebAssembly.instantiateStreaming(response,imports);return result.then(callback,function(reason){err(`wasm streaming compile failed: ${reason}`);err("falling back to ArrayBuffer instantiation");return instantiateArrayBuffer(binaryFile,imports,callback)})})}return instantiateArrayBuffer(binaryFile,imports,callback)}function createWasm(){var info={"env":wasmImports,"wasi_snapshot_preview1":wasmImports};function receiveInstance(instance,module){wasmExports=instance.exports;Module["wasmExports"]=wasmExports;wasmMemory=wasmExports["memory"];Module["wasmMemory"]=wasmMemory;updateMemoryViews();wasmTable=wasmExports["__indirect_function_table"];addOnInit(wasmExports["__wasm_call_ctors"]);removeRunDependency("wasm-instantiate");return wasmExports}addRunDependency("wasm-instantiate");function receiveInstantiationResult(result){receiveInstance(result["instance"])}if(Module["instantiateWasm"]){try{return Module["instantiateWasm"](info,receiveInstance)}catch(e){err(`Module.instantiateWasm callback failed with error: ${e}`);readyPromiseReject(e)}}instantiateAsync(wasmBinary,wasmBinaryFile,info,receiveInstantiationResult).catch(readyPromiseReject);return{}}var callRuntimeCallbacks=callbacks=>{while(callbacks.length>0){callbacks.shift()(Module)}};var noExitRuntime=Module["noExitRuntime"]||true;var abortOnCannotGrowMemory=requestedSize=>{abort("OOM")};var _emscripten_resize_heap=requestedSize=>{var oldSize=HEAPU8.length;requestedSize>>>=0;abortOnCannotGrowMemory(requestedSize)};var uleb128Encode=(n,target)=>{if(n<128){target.push(n)}else{target.push(n%128|128,n>>7)}};var sigToWasmTypes=sig=>{var typeNames={"i":"i32","j":"i64","f":"f32","d":"f64","e":"externref","p":"i32"};var type={parameters:[],results:sig[0]=="v"?[]:[typeNames[sig[0]]]};for(var i=1;i<sig.length;++i){type.parameters.push(typeNames[sig[i]])}return type};var generateFuncType=(sig,target)=>{var sigRet=sig.slice(0,1);var sigParam=sig.slice(1);var typeCodes={"i":127,"p":127,"j":126,"f":125,"d":124,"e":111};target.push(96);uleb128Encode(sigParam.length,target);for(var i=0;i<sigParam.length;++i){target.push(typeCodes[sigParam[i]])}if(sigRet=="v"){target.push(0)}else{target.push(1,typeCodes[sigRet])}};var convertJsFunctionToWasm=(func,sig)=>{if(typeof WebAssembly.Function=="function"){return new WebAssembly.Function(sigToWasmTypes(sig),func)}var typeSectionBody=[1];generateFuncType(sig,typeSectionBody);var bytes=[0,97,115,109,1,0,0,0,1];uleb128Encode(typeSectionBody.length,bytes);bytes.push(...typeSectionBody);bytes.push(2,7,1,1,101,1,102,0,0,7,5,1,1,102,0,0);var module=new WebAssembly.Module(new Uint8Array(bytes));var instance=new WebAssembly.Instance(module,{"e":{"f":func}});var wrappedFunc=instance.exports["f"];return wrappedFunc};var wasmTable;var getWasmTableEntry=funcPtr=>wasmTable.get(funcPtr);var updateTableMap=(offset,count)=>{if(functionsInTableMap){for(var i=offset;i<offset+count;i++){var item=getWasmTableEntry(i);if(item){functionsInTableMap.set(item,i)}}}};var functionsInTableMap;var getFunctionAddress=func=>{if(!functionsInTableMap){functionsInTableMap=new WeakMap;updateTableMap(0,wasmTable.length)}return functionsInTableMap.get(func)||0};var freeTableIndexes=[];var getEmptyTableSlot=()=>{if(freeTableIndexes.length){return freeTableIndexes.pop()}try{wasmTable.grow(1)}catch(err){if(!(err instanceof RangeError)){throw err}throw"Unable to grow wasm table. Set ALLOW_TABLE_GROWTH."}return wasmTable.length-1};var setWasmTableEntry=(idx,func)=>wasmTable.set(idx,func);var addFunction=(func,sig)=>{var rtn=getFunctionAddress(func);if(rtn){return rtn}var ret=getEmptyTableSlot();try{setWasmTableEntry(ret,func)}catch(err){if(!(err instanceof TypeError)){throw err}var wrapped=convertJsFunctionToWasm(func,sig);setWasmTableEntry(ret,wrapped)}functionsInTableMap.set(func,ret);return ret};var wasmImports={emscripten_resize_heap:_emscripten_resize_heap};var wasmExports=createWasm();var ___wasm_call_ctors=()=>(___wasm_call_ctors=wasmExports["__wasm_call_ctors"])();var _hb_blob_create=Module["_hb_blob_create"]=(a0,a1,a2,a3,a4)=>(_hb_blob_create=Module["_hb_blob_create"]=wasmExports["hb_blob_create"])(a0,a1,a2,a3,a4);var _hb_blob_destroy=Module["_hb_blob_destroy"]=a0=>(_hb_blob_destroy=Module["_hb_blob_destroy"]=wasmExports["hb_blob_destroy"])(a0);var _free=Module["_free"]=a0=>(_free=Module["_free"]=wasmExports["free"])(a0);var _hb_blob_get_length=Module["_hb_blob_get_length"]=a0=>(_hb_blob_get_length=Module["_hb_blob_get_length"]=wasmExports["hb_blob_get_length"])(a0);var _hb_blob_get_data=Module["_hb_blob_get_data"]=(a0,a1)=>(_hb_blob_get_data=Module["_hb_blob_get_data"]=wasmExports["hb_blob_get_data"])(a0,a1);var _malloc=Module["_malloc"]=a0=>(_malloc=Module["_malloc"]=wasmExports["malloc"])(a0);var _hb_buffer_serialize_glyphs=Module["_hb_buffer_serialize_glyphs"]=(a0,a1,a2,a3,a4,a5,a6,a7,a8)=>(_hb_buffer_serialize_glyphs=Module["_hb_buffer_serialize_glyphs"]=wasmExports["hb_buffer_serialize_glyphs"])(a0,a1,a2,a3,a4,a5,a6,a7,a8);var _hb_buffer_create=Module["_hb_buffer_create"]=()=>(_hb_buffer_create=Module["_hb_buffer_create"]=wasmExports["hb_buffer_create"])();var _hb_buffer_destroy=Module["_hb_buffer_destroy"]=a0=>(_hb_buffer_destroy=Module["_hb_buffer_destroy"]=wasmExports["hb_buffer_destroy"])(a0);var _hb_buffer_get_content_type=Module["_hb_buffer_get_content_type"]=a0=>(_hb_buffer_get_content_type=Module["_hb_buffer_get_content_type"]=wasmExports["hb_buffer_get_content_type"])(a0);var _hb_buffer_set_direction=Module["_hb_buffer_set_direction"]=(a0,a1)=>(_hb_buffer_set_direction=Module["_hb_buffer_set_direction"]=wasmExports["hb_buffer_set_direction"])(a0,a1);var _hb_buffer_set_script=Module["_hb_buffer_set_script"]=(a0,a1)=>(_hb_buffer_set_script=Module["_hb_buffer_set_script"]=wasmExports["hb_buffer_set_script"])(a0,a1);var _hb_buffer_set_language=Module["_hb_buffer_set_language"]=(a0,a1)=>(_hb_buffer_set_language=Module["_hb_buffer_set_language"]=wasmExports["hb_buffer_set_language"])(a0,a1);var _hb_buffer_set_flags=Module["_hb_buffer_set_flags"]=(a0,a1)=>(_hb_buffer_set_flags=Module["_hb_buffer_set_flags"]=wasmExports["hb_buffer_set_flags"])(a0,a1);var _hb_buffer_set_cluster_level=Module["_hb_buffer_set_cluster_level"]=(a0,a1)=>(_hb_buffer_set_cluster_level=Module["_hb_buffer_set_cluster_level"]=wasmExports["hb_buffer_set_cluster_level"])(a0,a1);var _hb_buffer_get_length=Module["_hb_buffer_get_length"]=a0=>(_hb_buffer_get_length=Module["_hb_buffer_get_length"]=wasmExports["hb_buffer_get_length"])(a0);var _hb_buffer_get_glyph_infos=Module["_hb_buffer_get_glyph_infos"]=(a0,a1)=>(_hb_buffer_get_glyph_infos=Module["_hb_buffer_get_glyph_infos"]=wasmExports["hb_buffer_get_glyph_infos"])(a0,a1);var _hb_buffer_get_glyph_positions=Module["_hb_buffer_get_glyph_positions"]=(a0,a1)=>(_hb_buffer_get_glyph_positions=Module["_hb_buffer_get_glyph_positions"]=wasmExports["hb_buffer_get_glyph_positions"])(a0,a1);var _hb_glyph_info_get_glyph_flags=Module["_hb_glyph_info_get_glyph_flags"]=a0=>(_hb_glyph_info_get_glyph_flags=Module["_hb_glyph_info_get_glyph_flags"]=wasmExports["hb_glyph_info_get_glyph_flags"])(a0);var _hb_buffer_guess_segment_properties=Module["_hb_buffer_guess_segment_properties"]=a0=>(_hb_buffer_guess_segment_properties=Module["_hb_buffer_guess_segment_properties"]=wasmExports["hb_buffer_guess_segment_properties"])(a0);var _hb_buffer_add_utf8=Module["_hb_buffer_add_utf8"]=(a0,a1,a2,a3,a4)=>(_hb_buffer_add_utf8=Module["_hb_buffer_add_utf8"]=wasmExports["hb_buffer_add_utf8"])(a0,a1,a2,a3,a4);var _hb_buffer_add_utf16=Module["_hb_buffer_add_utf16"]=(a0,a1,a2,a3,a4)=>(_hb_buffer_add_utf16=Module["_hb_buffer_add_utf16"]=wasmExports["hb_buffer_add_utf16"])(a0,a1,a2,a3,a4);var _hb_buffer_set_message_func=Module["_hb_buffer_set_message_func"]=(a0,a1,a2,a3)=>(_hb_buffer_set_message_func=Module["_hb_buffer_set_message_func"]=wasmExports["hb_buffer_set_message_func"])(a0,a1,a2,a3);var _hb_language_from_string=Module["_hb_language_from_string"]=(a0,a1)=>(_hb_language_from_string=Module["_hb_language_from_string"]=wasmExports["hb_language_from_string"])(a0,a1);var _hb_script_from_string=Module["_hb_script_from_string"]=(a0,a1)=>(_hb_script_from_string=Module["_hb_script_from_string"]=wasmExports["hb_script_from_string"])(a0,a1);var _hb_feature_from_string=Module["_hb_feature_from_string"]=(a0,a1,a2)=>(_hb_feature_from_string=Module["_hb_feature_from_string"]=wasmExports["hb_feature_from_string"])(a0,a1,a2);var _hb_draw_funcs_set_move_to_func=Module["_hb_draw_funcs_set_move_to_func"]=(a0,a1,a2,a3)=>(_hb_draw_funcs_set_move_to_func=Module["_hb_draw_funcs_set_move_to_func"]=wasmExports["hb_draw_funcs_set_move_to_func"])(a0,a1,a2,a3);var _hb_draw_funcs_set_line_to_func=Module["_hb_draw_funcs_set_line_to_func"]=(a0,a1,a2,a3)=>(_hb_draw_funcs_set_line_to_func=Module["_hb_draw_funcs_set_line_to_func"]=wasmExports["hb_draw_funcs_set_line_to_func"])(a0,a1,a2,a3);var _hb_draw_funcs_set_quadratic_to_func=Module["_hb_draw_funcs_set_quadratic_to_func"]=(a0,a1,a2,a3)=>(_hb_draw_funcs_set_quadratic_to_func=Module["_hb_draw_funcs_set_quadratic_to_func"]=wasmExports["hb_draw_funcs_set_quadratic_to_func"])(a0,a1,a2,a3);var _hb_draw_funcs_set_cubic_to_func=Module["_hb_draw_funcs_set_cubic_to_func"]=(a0,a1,a2,a3)=>(_hb_draw_funcs_set_cubic_to_func=Module["_hb_draw_funcs_set_cubic_to_func"]=wasmExports["hb_draw_funcs_set_cubic_to_func"])(a0,a1,a2,a3);var _hb_draw_funcs_set_close_path_func=Module["_hb_draw_funcs_set_close_path_func"]=(a0,a1,a2,a3)=>(_hb_draw_funcs_set_close_path_func=Module["_hb_draw_funcs_set_close_path_func"]=wasmExports["hb_draw_funcs_set_close_path_func"])(a0,a1,a2,a3);var _hb_draw_funcs_create=Module["_hb_draw_funcs_create"]=()=>(_hb_draw_funcs_create=Module["_hb_draw_funcs_create"]=wasmExports["hb_draw_funcs_create"])();var _hb_face_create=Module["_hb_face_create"]=(a0,a1)=>(_hb_face_create=Module["_hb_face_create"]=wasmExports["hb_face_create"])(a0,a1);var _hb_face_destroy=Module["_hb_face_destroy"]=a0=>(_hb_face_destroy=Module["_hb_face_destroy"]=wasmExports["hb_face_destroy"])(a0);var _hb_face_reference_table=Module["_hb_face_reference_table"]=(a0,a1)=>(_hb_face_reference_table=Module["_hb_face_reference_table"]=wasmExports["hb_face_reference_table"])(a0,a1);var _hb_face_get_upem=Module["_hb_face_get_upem"]=a0=>(_hb_face_get_upem=Module["_hb_face_get_upem"]=wasmExports["hb_face_get_upem"])(a0);var _hb_face_collect_unicodes=Module["_hb_face_collect_unicodes"]=(a0,a1)=>(_hb_face_collect_unicodes=Module["_hb_face_collect_unicodes"]=wasmExports["hb_face_collect_unicodes"])(a0,a1);var _hb_font_get_h_extents=Module["_hb_font_get_h_extents"]=(a0,a1)=>(_hb_font_get_h_extents=Module["_hb_font_get_h_extents"]=wasmExports["hb_font_get_h_extents"])(a0,a1);var _hb_font_get_glyph_extents=Module["_hb_font_get_glyph_extents"]=(a0,a1,a2)=>(_hb_font_get_glyph_extents=Module["_hb_font_get_glyph_extents"]=wasmExports["hb_font_get_glyph_extents"])(a0,a1,a2);var _hb_font_draw_glyph=Module["_hb_font_draw_glyph"]=(a0,a1,a2,a3)=>(_hb_font_draw_glyph=Module["_hb_font_draw_glyph"]=wasmExports["hb_font_draw_glyph"])(a0,a1,a2,a3);var _hb_font_glyph_to_string=Module["_hb_font_glyph_to_string"]=(a0,a1,a2,a3)=>(_hb_font_glyph_to_string=Module["_hb_font_glyph_to_string"]=wasmExports["hb_font_glyph_to_string"])(a0,a1,a2,a3);var _hb_font_create=Module["_hb_font_create"]=a0=>(_hb_font_create=Module["_hb_font_create"]=wasmExports["hb_font_create"])(a0);var _hb_font_destroy=Module["_hb_font_destroy"]=a0=>(_hb_font_destroy=Module["_hb_font_destroy"]=wasmExports["hb_font_destroy"])(a0);var _hb_font_set_scale=Module["_hb_font_set_scale"]=(a0,a1,a2)=>(_hb_font_set_scale=Module["_hb_font_set_scale"]=wasmExports["hb_font_set_scale"])(a0,a1,a2);var _hb_font_set_variations=Module["_hb_font_set_variations"]=(a0,a1,a2)=>(_hb_font_set_variations=Module["_hb_font_set_variations"]=wasmExports["hb_font_set_variations"])(a0,a1,a2);var _hb_set_create=Module["_hb_set_create"]=()=>(_hb_set_create=Module["_hb_set_create"]=wasmExports["hb_set_create"])();var _hb_set_destroy=Module["_hb_set_destroy"]=a0=>(_hb_set_destroy=Module["_hb_set_destroy"]=wasmExports["hb_set_destroy"])(a0);var _hb_ot_var_get_axis_infos=Module["_hb_ot_var_get_axis_infos"]=(a0,a1,a2,a3)=>(_hb_ot_var_get_axis_infos=Module["_hb_ot_var_get_axis_infos"]=wasmExports["hb_ot_var_get_axis_infos"])(a0,a1,a2,a3);var _hb_set_get_population=Module["_hb_set_get_population"]=a0=>(_hb_set_get_population=Module["_hb_set_get_population"]=wasmExports["hb_set_get_population"])(a0);var _hb_set_next_many=Module["_hb_set_next_many"]=(a0,a1,a2,a3)=>(_hb_set_next_many=Module["_hb_set_next_many"]=wasmExports["hb_set_next_many"])(a0,a1,a2,a3);var _hb_shape=Module["_hb_shape"]=(a0,a1,a2,a3)=>(_hb_shape=Module["_hb_shape"]=wasmExports["hb_shape"])(a0,a1,a2,a3);var stackSave=()=>(stackSave=wasmExports["stackSave"])();var stackRestore=a0=>(stackRestore=wasmExports["stackRestore"])(a0);var stackAlloc=a0=>(stackAlloc=wasmExports["stackAlloc"])(a0);Module["wasmMemory"]=wasmMemory;Module["wasmExports"]=wasmExports;Module["stackAlloc"]=stackAlloc;Module["stackSave"]=stackSave;Module["stackRestore"]=stackRestore;Module["addFunction"]=addFunction;var calledRun;dependenciesFulfilled=function runCaller(){if(!calledRun)run();if(!calledRun)dependenciesFulfilled=runCaller};function run(){if(runDependencies>0){return}preRun();if(runDependencies>0){return}function doRun(){if(calledRun)return;calledRun=true;Module["calledRun"]=true;if(ABORT)return;initRuntime();readyPromiseResolve(Module);if(Module["onRuntimeInitialized"])Module["onRuntimeInitialized"]();postRun()}if(Module["setStatus"]){Module["setStatus"]("Running...");setTimeout(function(){setTimeout(function(){Module["setStatus"]("")},1);doRun()},1)}else{doRun()}}if(Module["preInit"]){if(typeof Module["preInit"]=="function")Module["preInit"]=[Module["preInit"]];while(Module["preInit"].length>0){Module["preInit"].pop()()}}run();


  return moduleArg.ready
}
);
})();
if (typeof exports === 'object' && typeof module === 'object')
  module.exports = Module;
else if (typeof define === 'function' && define['amd'])
  define([], () => Module);
export default Module;
