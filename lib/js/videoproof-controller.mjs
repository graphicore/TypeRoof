/* jshint esversion: 11, browser: true, unused:true, undef:true, laxcomma: true, laxbreak: true */
import opentype from '../../opentype.js/dist/opentype.module.js';

/**
 * Array.from( cartesianProductGen([['a', 'b'], ['c', 'd']]) )
 * >>> [['a', 'c'], ['a', 'd'], ['b', 'c'], ['b', 'd']]
 *
 * No intermediate arrays are created.
 */
function* cartesianProductGen([head, ...tail]) {
    if(!head)
        yield [];
    else {
        // NOTE: the sequence of productGen(tail) could be stored
        // here as an intermediate array, but it may not improve
        // performance, as it's heavier on memory:
        // let products = [...productGen(tail)];
        for(let item of head)
            for(let prod of cartesianProductGen(tail))
                yield [item, ...prod];
    }
}

/**
 *  Just like Pythons zip.
 */
function* zip(...arrays) {
    let len = Math.min(...arrays.map(a=>a.length));
    for(let i=0;i<len;i++)
        yield arrays.map(a=>a[i]); // jshint ignore:line
}


function* calculateKeyframes(orderedFilteredAxisRanges) {
    let axesOrder = orderedFilteredAxisRanges.length
            ? Array.from(zip(...orderedFilteredAxisRanges))[0]
            : []
      , axesMDM = [] // min-default-max
      ;
    // var axisRanges = (typeof rapBracket === 'object')
    //     // FIXME: rapBracket, rapTolerances are global
    //     ? axisRangesForRapBracket(currentFont.axes, rapBracket, rapTolerances)
    //     : currentFont.axes
    //     ;

    for(let [axis, axisRange] of orderedFilteredAxisRanges) {
        // mdn stands for min-default-max, however, the order
        // is default-min-max expect for opsz.
        // FIXME: find out the reason behind this.
        let mdmOrder = axis === 'opsz'
                ? ['min', 'default', 'max']
                : ['default', 'min', 'max']
          , mdm = mdmOrder.filter(k=>{ // jshint ignore:line
                    // This was loosely adopted from previous code
                    // where I didn't understand the full reasoning
                    // but for the present examples it produces the
                    // same result and is much more consise.
                    if(!('default' in axisRange))
                        throw new Error('SANITY CHECK ERROR: "default" must be in any axisRange.');
                    else if(!(k in axisRange))
                        return false;

                    if (k === 'default')
                        return true;
                    return (axisRange[k] !== axisRange['default']);
                })
                .map(k=>axisRange[k]) // jshint ignore:line
          ;
        axesMDM.push(mdm);
    }

    for(let axesValues of cartesianProductGen(axesMDM)) {
        yield Array.from(zip(axesOrder, axesValues));

        // let variationSettings = Object.fromEntries(zip(axesOrder, axesValues));
        // // FIXME: axesToFVS could take just the result of the zip
        // //        but it may get replaced entirely, so I leave it here
        // //        for the time being.
        // let fvs = axesToFVS(variationSettings);
        // // FIXME: I currently think there should be no duplicates.
        // if (fvs !== prev)
        //     fvsPerms.push(fvs);
        // else
        //     console.warn(`Found a case of duplication: ${fvs}`);
        // prev = fvs;
    }
    //return fvsPerms;

}

// For a more broadly useable tool, this should probaly be configurable per font.
// however 3 axes with each 3 (default, min, max) entries produces 3 * 3 * 3 = 27 keyframes
const REGISTERED_AXES_ORDERED = ['opsz', 'wdth', 'wght']; //, 'ital', 'slnt', 'grad', 'GRAD');

function calculateRegisteredKeyframes(axisRanges) {
    let orderedFilteredAxisRanges = [];
    // FIXME: registeredAxes is global
    for(let axis of REGISTERED_AXES_ORDERED) {
        if (!(axis in axisRanges)) {
            continue;
        }
        orderedFilteredAxisRanges.push([axis, axisRanges[axis]]);
    }
    return calculateKeyframes(orderedFilteredAxisRanges);
}

// could be a getter in VideproofFont
// as well as  return font.tables?.fvar?.axes || []
function _getFontAxisRanges(font) {
    let axisRanges = {}
      , axes = font.tables?.fvar?.axes
      ;
    if (!axes)
        return axisRanges;
    for (let axis of axes) {
        axisRanges[axis.tag] = {
            'name': 'name' in axis ? axis.name.en : axis.tag,
            'min': axis.minValue,
            'max': axis.maxValue,
            'default': axis.defaultValue
        };
    }
    return axisRanges;
}

function _interpolateKeyframe(t, fromKeyFrame, toKeyFrame) {
    // a xxKeyFrame looks like:
    //      [ [ "opsz", 144 ], [ "wdth", 151 ], [ "wght", 1000 ] ]
    // both keyframes must be compatible
    let result = [];
    for( let [i, [axis, fromVal]] of fromKeyFrame.entries()){
        let [, toVal] = toKeyFrame[i]
          , value = (toVal - fromVal) * t + fromVal
          ;
        result.push([axis, value]);
    }
    return result;
}

/**
 * The return value of the yield i.e. when calling:
 *          gen.next(genControl)
 * is formed like this:
 * genControl = {
 *       t: float, between 0 and < 1 (but it's mod 1 anyways)
 *            to go to the sevensth (index = 6) keyframe:
 *            t: 6 / keyframes.length
 *       duration: float, in seconds
 *            for 30 seconds duration for one loop
 *            duration: 30
 * }
 */
function* animationGenerator(performance, keyFrames, duration, newT) {
    let t = 0
      , lastExecution
        // in milli seconds, this can be changed dynamically
        // original default is 1000ms * keyFrames.length * 2
      , newDuration
      ;
    // run forever
    while(true) {
        let fps = 0;
        if(newT !== undefined) {
            // newT can be used to jump to a new position or to resume
            // animation after a pause.
            t = newT % 1;
        }
        // It's initially undefined, but then either t is 0
        // or newT was set as argument.
        else if(lastExecution !== undefined) {
            let frameTime = performance.now() - lastExecution
                // Need miliseconds, hence duration times 1000.
              , frameTimeFraction =  frameTime / (duration * 1000)
              ;
            fps = 1000 / frameTime;
            t = (t + frameTimeFraction) % 1; // 0 >= t < 1
        }
            // Also animate from keyFrames.length - 1 to 0, in a circle.
        let keyFramesPosition = keyFrames.length * t // float: 0 >= keyFramesPosition < keyFrames.length
          , fromKeyFrameIndex = Math.floor(keyFramesPosition) // int: 0 >= fromKeyFrameIndex < keyFrames.length-1
          , toKeyFrameIndex = fromKeyFrameIndex < keyFrames.length - 1
                            ? fromKeyFrameIndex + 1
                             // circle around
                            : 0
          , fromKeyFrame = keyFrames[fromKeyFrameIndex]
          , toKeyFrame = keyFrames[toKeyFrameIndex]
          , keyFrameT = keyFramesPosition % 1
          ;
        //if(!fromKeyFrame || !toKeyFrame)
        //    console.error(
        //        `t: ${t}`,
        //        `keyFrames.length: ${keyFrames.length}\n`,
        //        `fromKeyFrameIndex: ${fromKeyFrameIndex}\n`,
        //        `toKeyFrameIndex: ${toKeyFrameIndex}\n`
        //    );
        let frame = _interpolateKeyframe(keyFrameT, fromKeyFrame, toKeyFrame);
        lastExecution = performance.now();
        // call next like e.g: gen.next({duration: 20})
        // duration will be mapped to newDuration
        ({ t: newT, duration: newDuration } = yield [frame, t, fromKeyFrameIndex, keyFrameT, fps]);
        if(newDuration !== undefined)
            duration = newDuration;
    }
}

/**
 * Handy table, though so far it seems we only need the
 * first column for the src property of the @font-face rule
 *
 *   @font-face src 'format("{TYPE}");' |
 * | typical file name extension
 * | MIME Type
 * | full format name
 * -------- | ------ | ---------- | ----------
 * truetype | .ttf   | font/ttf   | TrueType
 * opentype | .otf   | font/otf   | OpenType
 * woff     | .woff  | font/woff  | Web Open Font Format
 * woff2    | .woff2 | font/woff2 | Web Open Font Format 2
 */
function getSrcFormatFromFileName(filenName) {
    let extension = filenName.split('.').pop()
      , result = ({
            ttf: 'truetype'
          , otf: 'opentype'
          , woff: 'woff'
          , woff2: 'woff2'
        })[extension]
      ;
    if(!result)
        throw new Error(`FORMAT NOT FOUND for "${filenName}" with extension "${extension}"`);
    return result;
}

// used as part of the font family (CSS) name, so we always can differentiate
// the source of the font.
class FontOrigin {
    valueOf() {
        throw new Error(`NOT IMPLEMENTED: "valueOf" in ${this.constructor.name}`);
    }
    get type () {
        throw new Error(`NOT IMPLEMENTED: "get type" in ${this.constructor.name}`);
    }
    get fileName() {
        throw new Error(`NOT IMPLEMENTED: "get fileName" in ${this.constructor.name}`);
    }
    get sourceFormat() {
        return getSrcFormatFromFileName(this.fileName);
    }
}

// Font origin for fonts loaded by URL, using a GET request. commonly
// the fonts that are built into the app and registerd in window.remoteFonts.
class FontOriginUrl extends FontOrigin {
    constructor(url) {
        super();
        this._url = url;
    }
    get type () {
        return 'from-url';
    }
    get fileName() {
        // CAUTION: simple split on "/" may not be sufficient!
        return this._url.split('/').pop();
    }
    valueOf() {
        return `${this.type}::${this._url}`;
    }
}

class FontOriginFile extends FontOrigin {
    constructor(fileName) {
        super();
        this._fileName = fileName;
    }
    get type () {
        return 'from-file';
    }
    get fileName() {
        return this._fileName;
    }
    valueOf() {
        return `${this.type}::${this._fileName}`;
    }
}

// To keep all knowledge and resources of a font in one place.
class VideoProofFont {
    constructor(fontObject, fontFace, orgin, document) {
        this._fontObject = fontObject;
        this._fontFace = fontFace;
        this._orgin = orgin;
        this._document = document;
    }

    get fontObject(){
        return this._fontObject;
    }

    // This is used as a unique id of the font within the app and
    // as the CSS-name.
    get fullName() {
        let getName = key=>{
            // default to "en"
            let entry = this._fontObject.tables.name[key]
              , defaultLang = 'en'
              ;
            if(defaultLang in entry)
                return entry[defaultLang];
            // Otherwise, just return the entry of the first key.
            for(let lang of Object.keys(entry))
                return entry[lang];
        };

        // getting sometimes
        //      DOMException: FontFace.family setter: Invalid font descriptor
        //
        // A well working example is: "from-url RobotoFlex Regular Version_2-136"
        return [
                 this._orgin.type
               , getName('fullName') // e.g. "RobotoFlex Regular"
                 // "Version 2.136" is not accepted here while
                 // "Version_2-136" is OK, seems like the "." (dot)
                 // is forbidden and the space before numbers as well.
                 // It's likely this needs more fixing in the future!
               , getName('version').replaceAll('.', '-').replaceAll(' ', '_')
               ].join(' ');
    }

    // release resources
    destroy() {
        this._document.fonts.delete(this._fontFace);
    }
}

function _makeFileInput (handleFiles, element) {
    // In this case, the input element is not even appended into the
    // document, we use it just for the browser native interface.
    var hiddenFileInput = element.ownerDocument.createElement('input');
    hiddenFileInput.setAttribute('type', 'file');
    hiddenFileInput.setAttribute('multiple', 'multiple');
    hiddenFileInput.style.display = 'none'; // can be hidden, no problem

    // for the file dialogue
    function fileInputChange(e) {
        /*jshint validthis:true, unused:vars*/
        handleFiles(this.files);
    }
    function forwardClick(e) {
        /*jshint unused:vars*/
        // forward the click => opens the file dialogue
        hiddenFileInput.click();
    }

    // for drag and drop
    function noAction(e) {
        e.stopPropagation();
        e.preventDefault();
    }
    function drop(e) {
        e.stopPropagation();
        e.preventDefault();
        handleFiles(e.dataTransfer.files);
    }

    hiddenFileInput.addEventListener('change', fileInputChange);
    element.addEventListener('click', forwardClick);
    element.addEventListener("dragenter", noAction);
    element.addEventListener("dragover", noAction);
    element.addEventListener("drop", drop);
}

// especially when we try to marry this project with varla-varfo, we'll
// have to control the CSS custom-properties thoroughly.
// FIXME: REGISTERED_AXES_ORDERED has similar content, plus, this
// could be just a function `--font-${axisTag}`, I don't think at this
// point renaming is required, but if it is a function, we can still do
// it simply and centrally.
//const AXISNAME2PROPNAME = new Map([
//            ['wght', '--font-weight']
//          , ['opsz', '--font-opsz']
//          , ['wdth', '--font-width']
//]);
function axisTag2PropName(axisTag) {
    return  `--font-${axisTag}`;
}


class _AnimationState {
    constructor(generator, keyFrames) {
        Object.defineProperties(this, {
            generator: {value: generator, writable: false, enumerable: true}
          , keyFrames: {value: keyFrames, writable: false, enumerable: true}
        });
        this._lastYield = null;
    }
    get type() {
        throw new Error(`NOT IMPLEMENTED: "get type" in abstract ${this.constructor.name}`);
    }
    toString() {
        return `[${this.constructor.name}]`;
    }
    set lastYield(value) {
        this._lastYield = value;
    }
    get lastYield() {
        return this._lastYield;
    }
}

class AnimationStateKeyFrames extends _AnimationState {
    constructor(generator, keyFrames) {
        super(generator, keyFrames);
    }
}

class AnimationStateMoar extends _AnimationState {
    constructor(generator, keyFrames, baseAnimationState, axisTag) {
        super(generator, keyFrames);
        Object.defineProperties(this, {
            baseAnimationState: {value: baseAnimationState, writable: false, enumerable: true}
          , axisTag: {value: axisTag, writable: false, enumerable: true}
        });
    }
}


export class VideoproofController {
    /**
     * contentWindow: a DOM.window that will contain the page content, i.e.
     * the proofs, where the font's are applied, it can be different to the
     * uiWindow, which holds the main controller UI.
     */
    constructor(contentWindow) {
        // FIXME: which window to use per case
        //        also, use domTool!
        this._contentWindow = contentWindow;
        this._mainUIElement = null;
        this._currentFontName = null;

        // animation state
        this._animationFrameRequestId = null;
        this._running = false;

        this._animationState = null;

        this._ui = null;// TODO: improve these apis!

        this._fonts = new Map();
        if(contentWindow.remoteFonts && Array.isArray(contentWindow.remoteFonts))
            this.loadFontsFromUrls(...contentWindow.remoteFonts);
        // `push` is the only valid API for window.remoteFonts.
        // It is better to use just one push, with many fonts instead
        // of many pushes, because then we only get one call to
        // loadFontsFromUrls, which only switches the inteface font once
        // for the call.
        contentWindow.remoteFonts = {push: (...urls)=>this.loadFontsFromUrls(...urls)};
    }

    async _loadFont(fontBuffer, origin, contentDocument) {
        let fontFace = new contentDocument.defaultView.FontFace('LOADING', fontBuffer)
          , fontObject = opentype.parse(fontBuffer)
          , font = new VideoProofFont(fontObject, fontFace, origin, contentDocument)
          ;
        if(this._fonts.has(font.fullName))
            // TODO: this could be resolved by entering a loop that alters
            // font.fullName until the name is free, the font object should
            // have a method to i.e. add a counter to fullName.
            throw new Error(`FONT ALREADY REGISTERED: ${font.fullName}`);

        let fullName =  font.fullName;
        fontFace.family = fullName;
        await contentDocument.fonts.add(fontFace);
        this._fonts.set(fullName, font);
        return fullName;
    }

    // Don't use this as public interface, instead call
    // loadFontsFromUrls with just one url, it will trigger the UI to
    // show the font immediately.
    async _loadFontFromUrl(url) {
        console.log('_loadFontFromUrl', url);
        let { fetch, document } = this._contentWindow
          , origin = new FontOriginUrl(url)
          , response = await fetch(url, {
                method: 'GET',
                // mode: 'cors', // no-cors, *cors, same-origin
                // cache: 'no-cache', // *default, no-cache, reload, force-cache, only-if-cached
                // redirect: 'follow', // manual, *follow, error
                // referrerPolicy: 'no-referrer', // no-referrer, *no-referrer-when-downgrade, origin, origin-when-cross-origin, same-origin, strict-origin, strict-origin-when-cross-origin, unsafe-url
            });

        if (!response.ok)
            throw new Error(`HTTP error! Status: ${ response.status }`);
        let fontBuffer = await response.arrayBuffer();
        return this._loadFont(fontBuffer, origin, document);
    }

    async _loadFontFromFile(file) {
        let origin = new FontOriginFile(file.name)
          , fontBuffer = await file.arrayBuffer()
          ;
        return this._loadFont(fontBuffer, origin, this._contentWindow.document);
    }

    // TODO: this is the last error handler and it's not very well made.
    uiReportError(error) {
         console.error(error);
         // FIXME
         alert(error);
    }

    async loadFontsFromFiles(...files) {
        return Promise.all(files.map(file=>this._loadFontFromFile( file )))
               .then(([fontName/*, ...restNames*/])=>this._activateLoadedFont(fontName))
               .catch(error => this.uiReportError(error));
    }

    async loadFontsFromUrls(...urls) {
        return Promise.all(urls.map(url=>this._loadFontFromUrl( url )))
            .then(([fontName/*, ...restNames*/])=>this._activateLoadedFont(fontName))
            .catch(error => this.uiReportError(error));
    }

    // runs when the ui can be build
    async initUI(mainUIElement) {
        console.log('initUI', mainUIElement);
        this._mainUIElement = mainUIElement;

        // TODO: Good drag and drop starting point!
        //_makeFileInput(files=>this.loadFontsFromFiles(...files));

        let doc = this._mainUIElement.ownerDocument
          , togglePlayButton = doc.createElement('button')
          , proof = doc.getElementById('the-proof')// doc.createElement('div')
          , status = doc.createElement('div')
          , axesInfo =  doc.createElement('div')
          , keyFramesContainer = doc.getElementById('keyframes-display') // is a <ul>
          , moarAxesContainer = doc.getElementById('moar-axes-display') // is a <ul>
          , duration = doc.createElement('input')
          , addFonts = doc.createElement('a')
          ;

        togglePlayButton.textContent = 'play/pause';
        togglePlayButton.addEventListener('click', ()=>this.toggleRunning());

        duration.type='number';
        duration.min='1';
        duration.step='1';
        duration.addEventListener('change', ()=>this.setDuration(parseFloat(duration.value)));

        addFonts.textContent = '+ Add your own';
        _makeFileInput(files=>this.loadFontsFromFiles(...files), addFonts);

        this._mainUIElement.append(status, axesInfo, togglePlayButton, duration, addFonts);
        this._ui = {status, axesInfo, proof, keyFramesContainer, moarAxesContainer
                    , duration, addFonts};

        this._onUILoaded();
    }

    _onUILoaded() {
        let fontName;
        if(this._currentFontName)
            fontName = this._currentFontName;
        else
            fontName = Array.from(this._fonts.keys()).pop();
        if(!fontName) {
            console.warn('No font available yet.');
            return;
        }
        return this.activateFont(fontName);
    }

    async _activateLoadedFont(fontName) {
        // activateFont will only set this._currentFontName if it finds
        // the ui to be available, which may not be the case when the page
        // is freshly loaded, fonts loaded via the ui from e.g. drag and
        // drop won't have this race condition. Hence, we store it here,
        // then it can be used when ui becomes ready in initUI.
        this._currentFontName = fontName;
        return this.activateFont(fontName);
    }

    _scheduleIterate(genControl={}) {
        if(this._animationFrameRequestId !== null)
            // is already scheduled
            return;
        this._animationFrameRequestId = this._contentWindow.requestAnimationFrame(()=>this._iterate(genControl));
    }
    _unscheduleIterate() {
        this._contentWindow.cancelAnimationFrame( this._animationFrameRequestId );
        this._animationFrameRequestId = null;
    }

    _iterate(genControl={}) {
        // clean up for _scheduleIterate
        this._unscheduleIterate();

        if(!this._animationState) return;

        let yieldVal = this._animationState.generator.next(genControl);
        if(yieldVal.done) {
            return;
        }
        this._animationState.lastYield = yieldVal.value;
        this._uiSetAnimatonState();

        // schedule next round
        if(this._running)
            this._scheduleIterate();
    }
    setRunning(isRunning) {
        if(this._running === !!isRunning) // jshint ignore:line
            return;
        console.log('videoproof.setRunning', isRunning);

        // changed
        this._running = !!isRunning;

        if(!this._running) {
            // this._reportStatus('paused');
            this._unscheduleIterate();
            return;
        }

        if(!this._animationState)
            // as soon as a generator is available and this._iterate()
            // is called, the generator will continue
            return;


        // continue!
        // [frame, t, fromKeyFrameIndex, keyFrameT/*, fps */] =  this._animationState.lastYield
        let [, t] =  this._animationState.lastYield
          , genControl = { t }
          ;
        this._scheduleIterate(genControl);
        return;
    }

    run() {
        this.setRunning(true);
    }
    pause() {
        this.setRunning(false);
    }
    toggleRunning() {
        console.log('toggleRunning');
        this.setRunning(!this._running);
    }

    // FIXME: not sure we need this, as we always would like to have
    // the generator interface links etc. But if we keep this, there
    // needs to be a way to e.g. disable generator controls.
    cancel() {
        this.setRunning(false);
        this._animationState = null;
    }

    goToAnimationTime(t) {
        // * cancels the scheduled iterate,
        // * iterates,
        // * if running:
        //       schedules next.
        this._iterate({t});
    }

    setDuration(duration) {
        this._ui.duration.value = `${duration}`;

        let [, t] = this._lastAnimationState
          , genControl = { t, duration: duration}
          ;

        this._iterate(genControl);
    }

    getFont(fontName) {
        let font = this._fonts.get(fontName);
        if(!font)
            throw new Error(`FONT NOT FOUND: ${fontName}`);
        return font;
    }

    get currentFont() {
        return this.getFont(this._currentFontName);
    }

    // TODO: needs e.g. to unset the moar link highlighting
    // but that could also be handled in this._uiSetAnimatonState
    // but, we need to handle switching animations
    _setAnimationState(animationState) {
        this._animationState = animationState;
        // set first frame to UI
        // if this._running is true the animation will be rescheduled
        // otherwise, this will be paused.
        this._iterate();
    }

    async activateFont(fontName) {
        // will trigger if fontName does not exist
        this.getFont(fontName);
        // CAUTION: mainUIElement may not be in this._contentWindow
        // and hence wouldn't have CSS access to the fonts. But this is
        // just a fixed example without that issue.
        if(!this._ui) {
            console.warn(`activateFont: No ui element available yet to activate ${fontName}.`);
            return false;
        }

        // attempt to start the animation
        // this._reportStatus('init');
        // FIXME: UI-Wise, it would be good to have this external
        // from setting running to do, because, we could display
        // the paused state.
        let animationState = this._initAnimationGenerator();
        this._initMoarAnimationLinks();
        this._setAnimationState(animationState);
    }

    _initAnimationGenerator(genControl={}) {
        // apply base font styles
        let font = this.currentFont
          , axisRanges = _getFontAxisRanges(font.fontObject)
          , keyFrames = Array.from(calculateRegisteredKeyframes(axisRanges))
          , { proof, keyFramesContainer } = this._ui
          , doc = keyFramesContainer.ownerDocument
          ;

        // FIXME: maybe we should also set this in _uiSetAnimationState,
        // it could even be a value of this._animationState
        proof.style.setProperty('font-family', this._currentFontName);

        // create a generator that samples through the animation space ...

        // FIXME: use domTool
        while(keyFramesContainer.lastChild)
            keyFramesContainer.lastChild.remove();

        let gotoKeyframe = evt=>{
            if(this._animationState instanceof AnimationStateMoar) {
                // TODO: not sure, but, if we would stack more _AnimationStates
                // in this case we could get the baseAnimationState (while...)
                // property until we have one of the type AnimationStateKeyFrames
                this._animationState = this._animationState.baseAnimationState;
            }
            else if(!(this._animationState instanceof AnimationStateKeyFrames))
                throw new Error(`NOT IMPLEMENTED: go back to main animation from ${this._animationState}`);

            let li = evt.target.parentNode
              , ul = li.parentNode
              , children = Array.from(ul.children)
              , t = children.indexOf(li)/children.length
              ;
            this.goToAnimationTime(t);
        };
        for(let keyFrame of keyFrames) {
            let li = doc.createElement('li')
              , a = doc.createElement('a')
              ;
            li.append(a);
            // this would be a good rule for css
            li.style.setProperty('color', 'hsl(0, 100%, calc(50% * var(--keyframe-t, 0)))');
            a.textContent = keyFrame.map(([name, value])=>`${name} ${value}`).join(', ');
            a.addEventListener('click', gotoKeyframe);
            keyFramesContainer.append(li);
        }

        let {duration = keyFrames.length * 2, t: startT = 0} = genControl
          , gen = animationGenerator(this._contentWindow.performance, keyFrames, duration, startT)
          ;
        this._ui.duration.value = duration;
        return new AnimationStateKeyFrames(gen, keyFrames);
    }

    _moarActivate(axisTag, genControl={}) {
        let baseAnimationState;
        if(this._animationState instanceof AnimationStateKeyFrames)
            // switch from main keyframes animation
            baseAnimationState = this._animationState;
        else if(this._animationState instanceof AnimationStateMoar)
            // switch from other moar animation
            baseAnimationState = this._animationState.baseAnimationState;
        else
            throw new Error(`UNKNOWN ANIMATION STATE ${this._animationState} `
                          + `(typeof ${typeof this._animationState})`);

        let font = this.currentFont
          , axisRanges = _getFontAxisRanges(font.fontObject)
          , [baseFrame, ] = baseAnimationState.lastYield
          ;

        // frame is e.g.:
        //     [
        //         [ "opsz", 8 ]
        //         [ "wdth", 25 ]
        //         [ "wght", 369.69999999999976 ]
        //     ]

        let orderedFilteredAxisRanges = baseFrame.map(([axisTag, value])=>[axisTag, {'default': value}]);
        orderedFilteredAxisRanges.push([axisTag, axisRanges[axisTag]]);

        let keyFrames = Array.from(calculateKeyframes(orderedFilteredAxisRanges))
          , {duration = keyFrames.length * 2, t: startT = 0} = genControl
          , gen = animationGenerator(this._contentWindow.performance, keyFrames, duration, startT)
          ;
        this._ui.duration.value = duration;
        let animationState = new AnimationStateMoar(gen, keyFrames, baseAnimationState, axisTag);
        this._setAnimationState(animationState);
    }

    _initMoarAnimationLinks() {
        // has to take the current animation state into account,
        // so as a base we should rely on
        //      [frame, ] = this._lastAnimationState
        let font = this.currentFont
          , axes = font.fontObject.tables?.fvar?.axes
          , { moarAxesContainer } = this._ui
          , doc = moarAxesContainer.ownerDocument
          ;
        if(!axes)
            axes = [];

        while(moarAxesContainer.lastChild)
            moarAxesContainer.lastChild.remove();

        let handleClick = evt=>this._moarActivate(evt.target.dataset.axisTag);
        for (let axis of axes) {
            if (REGISTERED_AXES_ORDERED.indexOf(axis.tag) !== -1)
                // because registered axes are part of the regular keyframes
                continue;
            let font = this.currentFont
              , axisRanges = _getFontAxisRanges(font.fontObject)
              , info = axisRanges[axis.tag]
              , li = doc.createElement('li')
              , a = document.createElement('a')
              ;
            a.textContent = `${info.name} ${info.min} ${info['default']} ${info.max}`;
            a.dataset.axisTag = axis.tag;
            li.appendChild(a);
            moarAxesContainer.appendChild(li);
            a.addEventListener('click', handleClick);
        }
    }

    _uiSetAnimatonState() {
        // if(this._animationState instanceof AnimationStateKeyFrames) {
        // }
        // else if(this._animationState instanceof AnimationStateMoar) {
        // }
        let animationState = this._animationState.lastYield
          , keyFrames = this._animationState.keyFrames
          , {status, axesInfo, proof, keyFramesContainer, moarAxesContainer} = this._ui
          , [frame, t, fromKeyFrameIndex, keyFrameT/*, fps */] =  animationState
          , toKeyFrameIndex = fromKeyFrameIndex === keyFrames.length - 1
                                ? 0
                                : fromKeyFrameIndex + 1
          , axisTags = zip(...frame).next().value
            // FIXME: what we don't do is unsetting/cleaning up custom
            //        properties that are no longer used, instead, we just
            //        don't use the custom properties.
          , fontVariationSettings = axisTags.map(
                    axisTag=>`"${axisTag}" var(${axisTag2PropName(axisTag)})`)
                .join(', ')
          ;
        // apply (maybe a class) for a font-variation-setttings rule
        // with css-custom properties
        // could also have all axes with default values to axes defaults,
        // but that could make standard css usage harder (I don't think we
        // need standard css, we rather need full control)
        if(fontVariationSettings !== proof.style.getPropertyValue('font-variation-settings')) {
            // Not sure if there's a performance issue when resetting to the
            // same value/
            proof.style.setProperty('font-variation-settings'
                                                , fontVariationSettings);
        }

        // FIXME: this is a hack while transitioning from the old version
        proof.dataset.genuineFontVariationSettings = fontVariationSettings;
        proof.dataset.genuineFontFamily = this._currentFontName;

        //TODO: make methods to control these UI states!
        if(this._animationState instanceof AnimationStateKeyFrames) {
            // For completeness, also e.g. when we change t in the animation,
            // we should unset all items that are not fromKeyFrameIndex
            // or toKeyFrameIndex
            for(let i=0,l=keyFramesContainer.children.length; i<l; i++) {
                if(i === fromKeyFrameIndex || i === toKeyFrameIndex)
                    continue;
                keyFramesContainer.children[i]
                        .style.setProperty('--keyframe-t', '');
            }
            keyFramesContainer.children[fromKeyFrameIndex]
                        .style.setProperty('--keyframe-t', 1 - keyFrameT );
            keyFramesContainer.children[toKeyFrameIndex]
                        .style.setProperty('--keyframe-t', keyFrameT);
        }

        let activateMoarLink = elem=>{
                elem.classList.add('active');
                elem.style.setProperty('color', 'red');
            }
          , deactivateMoarLink = elem=>{
                elem.classList.remove('active');
                elem.style.setProperty('color', null);
            }
          ;
        if(this._animationState instanceof AnimationStateMoar) {
            for(let elem of moarAxesContainer.querySelectorAll('a.active')) {
                if(elem.dataset.axisTag !== this._animationState.axisTag)
                    deactivateMoarLink(elem);
            }
            for(let elem of moarAxesContainer.querySelectorAll(`a[data-axis-tag=${this._animationState.axisTag}]`))
                activateMoarLink(elem);
        }
        else {
            for(let elem of moarAxesContainer.querySelectorAll('a.active')) {
                deactivateMoarLink(elem);
            }
        }

        status.textContent = ` -- ${Math.round(t * 100)} % i:${fromKeyFrameIndex} -- `;
        axesInfo.textContent = frame.map(
                ([name, value])=>`${name} ${Math.round(100 * value) / 100}`)
            .join(', ');

        for(let [axisTag, value] of frame) {
            let propName = axisTag2PropName(axisTag);
            proof.style.setProperty(propName, value);
        }
    }
}