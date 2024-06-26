/* jshint esversion: 11, browser: true, unused:true, undef:true, laxcomma: true, laxbreak: true, devel: true */

import * as opentype from './vendor/opentype.js/dist/opentype.module.js';
import {getDecompressSync} from './vendor/wawoff2/decompress.mjs';
const woff2decompress = await getDecompressSync();

import {zip} from './util.mjs';
import {
      VideoProofFont
    , VideoProofDeferredFont
    , FontOrigin
    , FontOriginUrl
    , FontOriginFile
} from './model/font.mjs';

import { UIDialogFontExists } from './components/font-loading.mjs';

// import {init as initExample} from './layouts/exmple.mjs';
import DOMTool from './domTool.mjs';
import LocalFontStorage from './local-font-storage.mjs';


import {
    Path
  , StateComparison
  // , getAllPathsAndValues
  , COMPARE_STATUSES
  // , getModel // (RootModel, path) => Model
  // , applyTo
  , getEntry
  , getDraftEntry
  , _PotentialWriteProxy
  , isDraftKeyError
} from './metamodel.mjs';

import {
    ApplicationModel // as ApplicationModel
  , InstalledFontModel
  , DeferredFontModel
  , AvailableFontsModel
  , InstalledFontsModel
  , AvailableLayoutModel
  , AvailableLayoutsModel
} from './components/main-model.mjs';

import { MainUIController, Layouts } from './components/main-ui.mjs';

import getHarfbuzz from './vendor/harfbuzzjs/harfbuzz.mjs';

async function parseFont(fontBuffer) {
    let fontBuffer_;
    const signature = opentype._parse.getTag(new DataView(fontBuffer, 0), 0);
    if(signature === 'wOFF')
        // Uncompressing woff directly here, as harfbuzz does not support
        // woff and fontObject.toArrayBuffer is limited by opentype being
        // unable to parse all tables, so the output of that misses data.
        fontBuffer_ = opentype.woffToOTF(fontBuffer);
    else if(signature === 'wOF2') {
        const ttfFontBufferView = woff2decompress(fontBuffer);
        fontBuffer_ = ttfFontBufferView.buffer.slice(
            ttfFontBufferView.byteOffset,
            ttfFontBufferView.byteLength + ttfFontBufferView.byteOffset
        );
    }
    else
        fontBuffer_ = fontBuffer;
    const fontObject = opentype.parse(fontBuffer_);
    return [fontObject, fontBuffer_];
}

/**
 * Outsourcing management of font files from the main controller
 * as it's complex and all over the main controller and this will help
 * to separate concerns. It's a pretty tight coupling though!
 */
class FontManager {
    constructor(widgetBus) {
        this._widgetBus = widgetBus;
        this._childrenWidgetBus = {
            get harfbuzz() {
                return widgetBus.harfbuzz;
            }
        }
        this._installedFontsReferenceCounter = new Map();
        this._releaseFontFn = new Map();
    }

    set _localFontStorage(localFontStorage) {
        // should override the protypt getter and setters.
        Object.defineProperty(this, '_localFontStorage', {
            value: localFontStorage
          , writtable: false
          , configurable: false
        });
    }
    get _localFontStorage() {
        throw new Error(`_localFontStorage is not available yet`);
    }

    get _domTool() {
        return this._widgetBus.domTool;
    }
    get _contentWindow() {
        return this._widgetBus.contentWindow;
    }

    get _requireStateDependencyDraft() {
        return this._widgetBus.requireStateDependencyDraft;
    }

    get _useStateDependency() {
        return this._widgetBus.useStateDependency;
    }

    get appReady() {
        return this._widgetBus.appReady;
    }


    async _getFontBufferFromDeferredFont(deferredFont) {
        if(deferredFont.buffer)
            return deferredFont.buffer;
        const dbData = await this._localFontStorage.get(deferredFont.fullName);
        return dbData.buffer;
    }

    async _hydrateFont(deferredFont) {
        const contentDocument = this._contentWindow.document
          , fontBuffer = await this._getFontBufferFromDeferredFont(deferredFont)
          , [fontObject, fontBuffer_] = await parseFont(fontBuffer)
          , origin = deferredFont.origin
          , fontFace = new contentDocument.defaultView.FontFace(deferredFont.fullName, fontBuffer_)
            // Used to pass fontBuffer which is the original, but may be
            // a woff2. For harfbuzzjs woff2 is not an option and since
            // it's already decompressed here, it's easier to use this
            // way. It may be required to keep the original buffer around
            // but at the moment this seems good enough.
          , font = new VideoProofFont(
                      this._childrenWidgetBus
                    , fontObject, origin, fontBuffer_
                    , fontFace, contentDocument
                    , deferredFont.fullName)
          ;
        await contentDocument.fonts.add(fontFace);
        return font;
    }

    _installedFontsReferenceCounterIncrease(fontName) {
        if(!this._installedFontsReferenceCounter.has(fontName)) {
            this._installedFontsReferenceCounter.set(fontName, 1);
            return 1;
        }
        const counter = this._installedFontsReferenceCounter.get(fontName) + 1;
        this._installedFontsReferenceCounter.set(fontName, counter);
        return counter;
    }

    _installedFontsReferenceCounterDecrease(fontName) {
        if(!this._installedFontsReferenceCounter.has(fontName))
            return 0;
        const counter = Math.max(0, this._installedFontsReferenceCounter.get(fontName) - 1);
        if(counter > 0)
            this._installedFontsReferenceCounter.set(fontName, counter);
        else
            this._installedFontsReferenceCounter.delete(fontName);
        return counter;
    }

    _installedFontsHasReferences(fontName) {
        if(!this._installedFontsReferenceCounter.has(fontName))
            return false;
        return this._installedFontsReferenceCounter.get(fontName) > 0;
    }

    /**
     * returns releaseFontFn
     * This installs a deferred font in the browser and puts it into
     * the installedFonts dependency.
     * It also increses a reference counter, that will be decreased by
     * the returned funtion releaseFontFn.
     * The font is going to be uninstalled when it's reference counter
     * is at zero.
     */
    async _installFont(fontName) {
        // Run only when all dependencies are loaded.
        if(!this.appReady) {
            console.warn(`_installFont: App not yet available for activating ${fontName}.`);
            return false;
        }
        const availableFonts = this._useStateDependency('availableFonts')
          , installedFontsDraft = this._requireStateDependencyDraft('installedFonts')
          ;

        // (deferred) font must be in availableFonts!
        if(!availableFonts.has(fontName))
            throw new Error(`KEY ERROR font not available "${fontName}".`);

        // if it is not in installedFonts it will be moved there,
        if(!installedFontsDraft.has(fontName)) {
            // by hydrating the deferred font
            const deferredFont = availableFonts.get(fontName).value
              , fontState = InstalledFontModel.createPrimalDraft({})
              ;
            fontState.value = await this._hydrateFont(deferredFont);
            installedFontsDraft.set(fontName, fontState);
        }
        const installedFont = installedFontsDraft.get(fontName).value;
        // increase the reference counter of the installed font
        this._installedFontsReferenceCounterIncrease(fontName);
        const releaseFontFn = ()=>{
            const installedFontsDraft = this._requireStateDependencyDraft('installedFonts');
            this._installedFontsReferenceCounterDecrease(fontName);
            if(this._installedFontsHasReferences(fontName))
                return;
            // FIXME: It would also be cool to delete these fonts just
            // before turning the draft into an immutable, so we don't
            // depend on the order of returning and borrowing to keep the
            // same object around.
            // Like an eventual cleanup job...
            installedFontsDraft.delete(fontName);
            installedFont.destroy();
        };
        return releaseFontFn;
    }

    /**
     * This is managing the installed fonts reference counter
     * (See _installFont) on a "per user" basis, because a user can be
     * controlled from different places in the app, this centralizes
     * tracking of its font resources.
     * userIdentifier can handily be the full path to the ForeignKey.
     */
    async useFont(userIdentifier, fontName) {
        // FIXME: should be handled elsewhere!
        // Especially, the install/release should be somehow centralized,
        // for a centralized user like activeFontKey, which is however
        // altered by different actors.
        const releaseFontFn = await this._installFont(fontName);
        if(this._releaseFontFn.has(userIdentifier))
            this._releaseFontFn.get(userIdentifier)();
        this._releaseFontFn.set(userIdentifier, releaseFontFn);
    }

    /**
     *
     * NOTE the functions in this._releaseFontFn call
     * this._requireStateDependencyDraft('installedFonts');
     *
     * This is only really interesting when the user, identified by
     * userIdentifier, is removed. but so far the only user /activeFontKey
     * is never removed. There will be cases though.
     */
    unuseFont(userIdentifier) {
        if(!this._releaseFontFn.has(userIdentifier))
            return;
        this._releaseFontFn.get(userIdentifier)();
        this._releaseFontFn.delete(userIdentifier);
    }

    async _loadFontsFromLoaderFn(sourceLoaderFn, ...sources) {
        const fontsAndNulls = await Promise.all(sources.map(sourceLoaderFn));
        return fontsAndNulls.filter(font=>!!font)
                            .map(font=>font.fullName);
    }

    async _uiDialogHandleFontExists(font) {
        const dialog = new UIDialogFontExists(this._domTool)
          , result = await dialog.show(font)
          ;
          dialog.destroy();
          return result;
    }

    async _registerFont(deferredFont) {
        // This reqquires a context where availableFontsDraft is already prepared.
        const availableFontsDraft = this._requireStateDependencyDraft('availableFonts')
          , fontName = deferredFont.fullName
          ;
        if(availableFontsDraft.has(fontName)) {
            if(!this.appReady)
                throw new Error(`FONT ALREADY REGISTERED: ${fontName}`);
            // TODO: this could be resolved by entering a loop (REPL) that alters
            // deferredFont.fullName until the name is free, the font object should
            // have a method to i.e. add a counter to fullName.
            //
            // FIXME: to be fully complete these calls should go into
            // an async queue to be resolved one after another, because
            // otherwise there's a race condition between the check above
            // and putting the font into availableFontsDraft. But it's likely
            // not a practical problem.
            const action = await this._uiDialogHandleFontExists(deferredFont);
            // keep, replace or initial
            // => initial should be the same as default
            // => the default is keep, as it changes least
            if(action === 'replace') {
                const installedFontsDraft = this._requireStateDependencyDraft('installedFonts');
                // if font.fullName is currently active, replace with he new version.
                if(installedFontsDraft.has(fontName)) {
                    // This doesn't change the reference counter, the
                    // font is literally replaced with another version.
                    // Via the model, the change will trickle down the
                    // model, but references counts are not affected.
                    const fontState = InstalledFontModel.createPrimalDraft({});
                    fontState.value = await this._hydrateFont(deferredFont);
                    installedFontsDraft.set(fontName, fontState);
                }
            }
            else {
                // handle "initial" and "keep": keep loaded font
                console.info(`Loading font "${fontName}" aborted by user.`);
                return false;
            }
        }
        const fontState = DeferredFontModel.createPrimalDraft({});
        fontState.value = deferredFont;
        availableFontsDraft.set(deferredFont.fullName, fontState);
        return true;
    }

    // Don't use this as public interface, instead call
    // loadFontsFromUrls with just one url, it will trigger the UI to
    // show the font immediately.
    async _loadFontFromUrl(url) {
        let { fetch } = this._contentWindow
          , response = await fetch(url, {
                method: 'GET',
                // mode: 'cors', // no-cors, *cors, same-origin
                // cache: 'no-cache', // *default, no-cache, reload, force-cache, only-if-cached
                // redirect: 'follow', // manual, *follow, error
                // referrerPolicy: 'no-referrer', // no-referrer, *no-referrer-when-downgrade, origin, origin-when-cross-origin, same-origin, strict-origin, strict-origin-when-cross-origin, unsafe-url
            });
        return this._loadFontFromFetchResponse(response);
    }

    async _loadFontFromFetchResponse(response) {
        if (!response.ok)
            throw new Error(`HTTP error! Status: ${ response.status }`);
        const origin = new FontOriginUrl(response.url)
          , fontBuffer = await response.arrayBuffer()
          , [fontObject, ] = await parseFont(fontBuffer)
            // Put buffer into the font, because there's no other place for it.
          , deferredFont = VideoProofDeferredFont.fromFontObject(fontObject, origin, fontBuffer)
          , registered = await this._registerFont(deferredFont)
          ;
        return registered === false ? null : deferredFont;
    }

    async _loadFontFromFile(file) {
        const origin = new FontOriginFile(file.name)
          , fontBuffer = await file.arrayBuffer()
          , [fontObject, ] = await parseFont(fontBuffer)
            // The buffer will got into local storage, so it is required here
            // it would be an option, not to keep that deferredFont object
            // around, create one without buffer, to keep memory lower,
            // but in most cases (one font was dropped) the buffer will
            // be used anyways right away.
          , deferredFont = VideoProofDeferredFont.fromFontObject(fontObject, origin, fontBuffer)
          , registered = await this._registerFont(deferredFont)
          ;
        if(registered === false)
            return null;
        await this._localFontStorage.put(deferredFont);// => result is the key (fullName) of the font
        return deferredFont;
    }

    async loadInitialFontsFromFetchPromises(...promises) {
        const fontsPromises = promises.map(async promise=>this._loadFontFromFetchResponse(await promise));
        return Promise.all(fontsPromises)
            .then(fonts=>{
                // Because we are bootstrapping availableFontsDraft  is available!
                const availableFontsDraft = this._requireStateDependencyDraft('availableFonts')
                  , keyEntriesInOriginalLoadOrder = fonts.map(font=>[font.fullName, availableFontsDraft.get(font.fullName)])
                  ;
                // Later keys will override earlier keys, so push will create
                // the original order. As long as no other method did write
                // to this, which shouldn't happen in bootstrap, these
                // items will be the first items in order in the map.
                availableFontsDraft.push(...keyEntriesInOriginalLoadOrder);
            });
    }

    onLocalFontStorage(localFontStorage) {
        this._localFontStorage = localFontStorage;
        return this._localFontStorage;
    }

    async loadInitialFontsFromLocalFontStorage(/* localFontStorage */) {
        // assert localFontStorage === this.localFontStorage
        // Because we are bootstrapping availableFontsDraft  is available!
        const availableFontsDraft = this._requireStateDependencyDraft('availableFonts');
        for await(const entry of this._localFontStorage.getAll()) {
            const font = new VideoProofDeferredFont(
                            FontOrigin.fromDB(entry.origin)
                          , entry.fullName
                          , entry.nameVersion
                          , entry.serializationNameParticles
                          , null);

            const fontState = DeferredFontModel.createPrimalDraft({});
            fontState.value = font;
            // no need to metamorphose fontState here, will happen along
            // with availableFontsDraft.metamorphose()
            availableFontsDraft.set(font.fullName, fontState);
        }
    }

    /**
     * Used as API connecting to font-loading.mjs
     */
    async loadFontsFromFiles(...files){
        return this._loadFontsFromLoaderFn(this._loadFontFromFile.bind(this), ...files);
    }
    // this._loadFontsFromLoaderFn.bind(this, this._loadFontFromUrl.bind(this))
    /**
     * So far unused, just for completeness.
     * Should be very similar to loadFontsFromFiles
     */
    async loadFontsFromUrls(...urls){
        return this._loadFontsFromLoaderFn(this._loadFontFromUrl.bind(this), ...urls);
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
        Object.defineProperty(this, 'appReady', {value: false, configurable: true});
        this.state = null;
        this.draftState = null;
        this._nestedChangeStateCount = 0;
        this._lockChangeState = null;

        this._domTool = new DOMTool(contentWindow.document);

        this._ui = null;// TODO: improve these apis!

        // FIXME: this should be readable directly from ApplicationModel
        this._stateDependencyModels = {
            availableFonts: AvailableFontsModel
          , installedFonts: InstalledFontsModel
          , availableLayouts: AvailableLayoutsModel
        };
        this._stateDependenciesDrafts = new Map();
        // required for bootstapping
        for(const key of Object.keys(this._stateDependencyModels))
            this._prepareStateDependencyDraft(key);

        this._externalInitialDependencies = new Map();
        function _setResolvers(key, resolve, reject) {
            // jshint validthis: true
            if(this._externalInitialDependencies.has(key))
                throw new Error(`KEY EXISTES ${key} in _externalInitialDependencies.`);
            this._externalInitialDependencies.set(key, {resolve, reject});
        }
        const _externalPromises = [];
        for(let key of ['ready', 'localFontStorage', 'harfbuzz'])
            _externalPromises.push([key, new Promise(_setResolvers.bind(this, key))]);

        this._harfbuzz = null;
        const _getAppReady=()=>this.appReady
          , _getHarfbuzz=()=>this.harfbuzz
          ;
        this._fontManager = new FontManager({
            contentWindow: this._contentWindow
          , domTool: this._domTool
          , get appReady(){ return _getAppReady(); }
          , requireStateDependencyDraft: this._requireStateDependencyDraft.bind(this)
          , useStateDependency: this._useStateDependency.bind(this)
          , get harfbuzz() { return _getHarfbuzz(); }
        });

        LocalFontStorage.init(contentWindow).then(
            result=>{
                this.setInitialDependency('localFontStorage', result);
                return result;
            }
          , error=>this._externalInitialDependencies.get('localFontStorage')
                       .reject(error)
        );

        getHarfbuzz().then(
            result=>{
                this.setInitialDependency('harfbuzz', result);
                return result;
            }
          , error=>this._externalInitialDependencies.get('harfbuzz')
                       .reject(error)
        );

        // Only allow this once, to resolve the race conditon, later
        // the loadFontsFromUrls interface should be exposed explicitly;
        let exhaustedInterfaceError = ()=>{
            throw new Error('EXHAUSTED INTERFACE: remoteResources');
        };

        let initialResourcesPromise
          , testDeferredRemoteResources = false
          , testDeferredRemoteTimeout = 3000 // set to 6000 to trigger the rejection
          , remoteResourcesAvailable = contentWindow.remoteResources && Array.isArray(contentWindow.remoteResources)
          ;

        // Because it can be hard to see the deferred case in the wild,
        // this contraption stays here for now, to simulate the case manually.
        // Something similar could be made from the html source of course.
        if(testDeferredRemoteResources && remoteResourcesAvailable) {
            console.warn(`Testing deferred remoteResources. Timeout: ${testDeferredRemoteTimeout}`);
            remoteResourcesAvailable = false;
            const _copiedRemoteResources = contentWindow.remoteResources.slice();
            contentWindow.setTimeout(
                ()=>{
                    console.warn(`Trigger test deferred remoteResources.`);
                    contentWindow.remoteResources.push(..._copiedRemoteResources);
                }
              , testDeferredRemoteTimeout
            );
        }

        let loadInitialResourcesFromPromises = this._loadInitialResourcesFromPromises.bind(this, ..._externalPromises);

        if(remoteResourcesAvailable) {
            initialResourcesPromise = loadInitialResourcesFromPromises(...contentWindow.remoteResources);
            contentWindow.remoteResources = {push: exhaustedInterfaceError};
        }
        else {
            // Definitely expect some remoteResources to be loaded, it's
            // not clear though, if this code runs before they are specified
            // in the DOM or after. There is a timeout to warn when
            // contentWindow.remoteResources is never pushed to i.e. forgotten.
            //
            // `push` is the only valid API for window.remoteResources.
            // It is better to use just one push, with many fonts instead
            // of many pushes, because then we only get one call to
            // loadFontsFromUrls, which only switches the inteface font once
            // for the call.
            let resolve, reject
              , rejectTimeout = setTimeout(()=>{
                    contentWindow.remoteResources.push=exhaustedInterfaceError;
                    reject(new Error('Not initiated: remoteResources!'));
                  }, 5000)
             ;
            initialResourcesPromise = new Promise((_resolve, _reject)=>{
                resolve = _resolve;
                reject = _reject;
            });
            contentWindow.remoteResources = {push: (...promises)=>{
                contentWindow.clearTimeout(rejectTimeout);
                resolve(loadInitialResourcesFromPromises(...promises));
                contentWindow.remoteResources.push=exhaustedInterfaceError;
            }};
        }

        Promise.all([initialResourcesPromise])
               .then((results)=>this._allInitialResourcesLoaded(...results))
               .catch(error=>this.uiReportError('VideoproofController constructor initial resources', error));
    }

    /**
     * Call if you are potentially going to change one of the state dependencies.
     * This will cerate a central draft and increment a reference counter.
     * When done working with the draft, e.g. after an async operation,
     * the _returnStateDependencyDraft method should be called to decrement
     * the reference count again, marking it ready to use when the count is
     * at 0.
     */
    _prepareStateDependencyDraft(key) {
        const [counter, draft] = this._stateDependenciesDrafts.has(key)
            ? this._stateDependenciesDrafts.get(key)
            : [0, (this.state
                        // initially there's no state
                        ? this.state.dependencies[key].getDraft()
                        : this._stateDependencyModels[key].createPrimalDraft({})
              )]
          ;
        this._stateDependenciesDrafts.set(key, [counter + 1, draft]);
        return draft;
    }

    /**
     * returns a boolean: readyToUse
     */
    _returnStateDependencyDraft(key) {
        if(!this._stateDependenciesDrafts.has(key))
            // There's a reference counter to resolve this, shouldn't happen.
            throw new Error(`Call to _returnStateDependencyDraft but there is no draft for "${key}"`);
        const [oldCounter, draft] = this._stateDependenciesDrafts.get(key)
          , counter = Math.max(0, oldCounter - 1)
          ;
        this._stateDependenciesDrafts.set(key, [counter, draft]);
        return counter <= 0;
    }

    /**
     * Returns the respective state dependency draft.
     * Raises an error when draft is not available.
     * To be used in contexts where it is expected that the state dependency
     * draft is available. This implies that eventually the context
     * will update state with the new dependencies.
     */
    _requireStateDependencyDraft(key) {
        if(!this._stateDependenciesDrafts.has(key))
            // There's a reference counter to resolve this, shouldn't happen.
            throw new Error(`Call to _requireStateDependencyDraft but there is no draft for "${key}". `
                + `Use _prepareStateDependencyDraft("${key}") first.`);
        const [/*counter*/, draft] = this._stateDependenciesDrafts.get(key);
        return draft;
    }

    /**
     * If there's no draft, use the current state dependency directly.
     * This is intended for reading from the latest version, which may
     * be the current draft or the value in the current state.
     */
    _useStateDependency(key) {
        if(!this._stateDependenciesDrafts.has(key))
            return this.state.dependencies[key];
        return this._requireStateDependencyDraft(key);
    }

    _uiStateDependencyDraftContextWrapper(makeAsync, fn, ...dependencies) {
        const enter=()=>{
                if(!this.draftState)
                    throw new Error(`CONTEXT ERROR {fn.name} is expected to be called from within withChangeState`);
                for(const key of dependencies)
                    this._prepareStateDependencyDraft(key);
            }
          , exit=()=>{
                for(const key of dependencies)
                    this._returnStateDependencyDraft(key);
            }
          ;
        if(makeAsync) {
            return async function (...args) {
                enter();
                try {
                    return await fn(...args);
                }
                finally {
                    exit();
                }
            };
        }
        else {
            return function (...args) {
                enter();
                try {
                    return fn(...args);
                }
                finally {
                    exit();
                }
            };
        }
    }

    async _allInitialResourcesLoaded(resources) {
        if(this.appReady)
            throw new Error('_allInitialResourcesLoaded must run only once.');
        Object.defineProperty(this, 'appReady', {value: true});

        console.log('_allInitialResourcesLoaded resources:', ...resources.keys(), resources);

        // No initial font available. Could be a legitimate deployment of this App.
        // However, we would have to change the model.
        //
        // Eventually the FontsModel must be initialuzed in the Model, even
        // though it doesn't matter in this case, it's the right thing to
        // do, there should be one recommended way to do things!
        //
        // charGroups should be part of the model, but I keep it external
        // to see where it leads! Also, it's not meant to change, so that
        // should be fine, and, if it changes, there's a way planned to
        // update the model when external dependencies change...
        console.log('AvailableFontsModel.Model.dependencies:', AvailableFontsModel.Model,AvailableFontsModel.Model.dependencies);
        console.log('AvailableFontsModel.dependencies:', AvailableFontsModel.dependencies);
        console.log('ApplicationModel.dependencies:', ApplicationModel.dependencies);
        // At some point it will be good to be able to load layouts
        // dynamically, on demand, as plug ins (requires deferredLayouts),
        // but for the basic stuff we just start with hard coded layouts.
        const availableLayoutsDraft = this._requireStateDependencyDraft('availableLayouts');
        for(const [key, label, LayoutModule] of Layouts) {
            const availableLayout = AvailableLayoutModel.createPrimalDraft({});
            availableLayout.get('typeClass').value = LayoutModule.Model;
            availableLayout.get('label').value = label;
            console.log('LayoutModel.constructor.name', LayoutModule.Model.name, LayoutModule.Model);
            availableLayoutsDraft.push([key, availableLayout]);
        }

        const availableFonts = this._requireStateDependencyDraft('availableFonts')
          , fontName = availableFonts.indexToKey(0)[0]
          , fontUserPath = '/activeFontKey'
          ;

        this._harfbuzz = resources.get('harfbuzz');
        // This puts an initial value into installedFonts and there's the
        // constraint ForeignKey.SET_DEFAULT_FIRST on "/activeFontKey" so
        // setting that inital value will be taken care of by that mechanism.
        await this._fontManager.useFont(fontUserPath, fontName);

        // This are the matching returns to the `this._prepareStateDependencyDraft(key)`
        // calls in constructor.
        for(const key of Object.keys(this._stateDependencyModels))
            this._returnStateDependencyDraft(key);

        const dependencies = this._collecStateDependencies(); // => {availableFonts, installedFonts, availableLayouts}
        this.state = ApplicationModel.createPrimalState(dependencies);
        // returns true if state was restored successfully
        // this._loadStateFromLocationHash();

        // this runs after restoring state, so we don't build the wrong
        // UI initiallly.
        this._lockChangeState = '_allInitialResourcesLoaded';
        try {
            // TODO: it would actually make sense to lazy load these resources,
            // as they are not necessary for all of the possible layouts.
            // CAUTION: For the charGroups data, a module that loads and
            // parses the json was created, for similar cases, modules
            // may be a better soltion. that's also why now the unused
            // code for charGroups was removed.
            this._initUI(/*{charGroups: resources.get('charGroups')}*/);
        }
        finally {
            this._lockChangeState = null;
        }
    }

    // This is basically only to ensure the document is loaded and ready
    // to be queried/changed, there's no other use case, expecting
    // the main program to call setInitialDependency('ready', true);
    setInitialDependency(key, value) {
        let dependency = this._externalInitialDependencies.get(key);
        if(!dependency)
            throw new Error(`KEY NOT FOUND setInitialDependency: ${key}`);
        // Resolving a seccond time doesn't do anything, the value of the
        // first time stays valid, but it hints to a programming issue.
        // Deleting here will make the second resolving of key fail with
        // an error.
        this._externalInitialDependencies.delete(key);
        dependency.resolve(value);
    }

    // TODO: this is the last error handler and it's not very well made.
    uiReportError(callerId, error) {
         console.error(`via ${callerId}:`, error);
         // FIXME
         alert(`via ${callerId}:${error}`);
        // DO?
        // throw(error);
    }

    // Runs when the ui can be build, but does not require resources like
    // the fonts to be available yet.
    _initUI(/*{ ... remote resources }*/) {
        // keeping this as it is triggered when the dependencies are loaded
        // for(const [state, ...path] of getAllPathsAndValues(this.state))
        //    console.log('-', '/'+path.join('/'), `::: ${state.toString()}`);

        this._ui = new MainUIController({ // widgetBus
            domTool: this._domTool
          , rootPath: Path.fromParts('/')
            //   TODO: this could define the default handler
            // , protocolHandlers: []
          , changeState: this.withChangeState.bind(this)
            // If not called from within withChangeState state will be an
            // immutable and making it a draft won't have an effect
            // on the app state.
          , getEntry: path=>{
                let entry = null;
                if(this.draftState) {
                    try {
                        entry = getDraftEntry(this.draftState, path);
                    }
                    catch(error) {
                        if(!isDraftKeyError(error))
                            throw error;
                        // PASS: Else, go on and use getEntry the potentially
                        // return non-draftable entries, such as a
                        // internalized dependency...
                    }
                }
                if(entry === null)
                    // This can still fail, but it allows to return
                    // non-draftable entries in draftMode, as this is a
                    // unspecific intereface, I'd expect it to work the
                    // "same" in draft mode or not.
                    entry = getEntry(this.state, path);

                // This is no longer true, as for e.g. internalized dependencies
                // we expect for this very general interface to return the
                //read-only non-draft object...
                // if(this.draftState && !(entry.isDraft || _PotentialWriteProxy.isProxy(entry))) {
                //     // FIXME: This is happening when trying to write to a ValueLink!
                //     // Very interesting indeed!
                //     // Would be nice to resolve that transparently somehow, somewhere!
                //     throw new Error(`ASSERTION FAILED entry must be draft path: ${path} entry: ${entry}`);
                // }
                if(!this.draftState && (entry.isDraft || _PotentialWriteProxy.isProxy(entry)))
                    throw new Error(`ASSERTION FAILED entry must not be draft; path: ${path} entry: ${entry}`);
                return entry;
            }
          , loadFontsFromFiles: this._uiStateDependencyDraftContextWrapper(true
                    , this._fontManager.loadFontsFromFiles.bind(this._fontManager)
                    , 'availableFonts', 'installedFonts')
          , loadFontsFromUrls: this._uiStateDependencyDraftContextWrapper(true
                    , this._fontManager.loadFontsFromUrls.bind(this._fontManager)
                    , 'availableFonts')
          , useFont: this._uiStateDependencyDraftContextWrapper(true
                    , this._fontManager.useFont.bind(this._fontManager)
                    , 'installedFonts')
          , unuseFont: this._uiStateDependencyDraftContextWrapper(false
                    , this._fontManager.unuseFont.bind(this._fontManager)
                    , 'installedFonts')
          , harfbuzz: this.harfbuzz // {hbjs, Module}
        });
        this._ui.initialUpdate(this.state);
    }

    get harfbuzz() {
        if(!this.appReady)
           throw new Error(`APP NOT READY: get harfbuzz`);
        return this._harfbuzz;
    }
    /* command is:
     * [rootPath, method, ...arguments]
     *
     * This is basically wrapping a transaction. And the transaction
     * contains the new draft as the root state (this.draftState)
     * Which will be the base for the getEntry API injected into the
     * UI.
     * It's allowed to call withChangeState in a nested fashion. It
     * uses a depth counter to update state only once, after all
     * calls have finished.
     * I wonder if there's any use in making the async and then
     * await fn() ..., the this._nestedChangeStateCount should
     * probably guard (raise if > 0) within _updateState, to make
     * sure everything happens in order. Also, external dependencies
     * that are loaded out of band would have to adhere to that pulse
     * as well.
     */
    async withChangeState(fn) {
        if(!this.appReady) {
            console.warn(`withChangeState: App not yet ready to change state.`);
            return false;
        }
        if( this._lockChangeState !== null )
            // This is a programming error, nothing a user should ever face.
            throw new Error('LOCK ERROR changeState is locked with the lock labeled: ${this._lockChangeState}.');

        // console.log(`${this.state} changeState...`);


        if(this.draftState === null)
            // assert this._nestedChangeStateCount === 0
            this.draftState = this.state.getDraft();
        this._nestedChangeStateCount += 1;
        const draft = this.draftState;
        let returnVal;
        try {
            // Doesn't have to be async, but if it is, we wait.
            // Especially to allow for dynamic loading of resources,
            // i.e. VideoProofDeferredFont
            // CAUTION: I'm not fully confident _nestedChangeStateCount
            // is sufficient here, we could als well add an async-queue
            // here to ensure the order of events is always maintaianed.
            const maybePromise = fn();
            // only async here if there's a "then". Don't bother to
            // check if the "then" is a function ot so, it's not
            // exact anyways.
            if(maybePromise && maybePromise.then !== undefined)
                returnVal = await maybePromise;
            else
                returnVal = maybePromise;
        }
        finally {
            this._nestedChangeStateCount -= 1;
            if(this._nestedChangeStateCount > 0)
                return returnVal;
            else
                this.draftState = null;
        }
        this._updateState(draft);
        return returnVal;
    }

    _collecStateDependencies() {
        const dependencies = {}
          , notReady = []
          ;
        for(const [key, [referenceCounter, draft]] of this._stateDependenciesDrafts) {
            if(referenceCounter <= 0)
                dependencies[key] = draft.metamorphose({});
            else
                notReady.push(`${key} (references: ${referenceCounter})`);
        }
        if(notReady.lenght)
            throw new Error(`UNFINISHED BUSINESS ERROR collecting state dependencies, but some are not ready for use: ${notReady.join(', ')}.`);
        this._stateDependenciesDrafts.clear();
        return dependencies;
    }

    _updateState(draft=null) {
        if(this.draftState){
            // This is within a withChangeState transaction and
            // withChangeState will call _updateState eventually.
            // Maybe it's enough to just return at this point...
            if(this.draftState === draft)
                return;
            // Though, if a draft was passed and that draft is not
            // this.draftState, the changes would get lost
            console.error('Looks like there shouldn\'t be a this.draftState when running this, but there is!');
        }
        const dependencies = this._collecStateDependencies()
          , hasNewDependencies = Object.keys(dependencies).length > 0
          ;

        if(draft === null && !hasNewDependencies)
            // This is a shortcut, the result would be the same as
            // newState === this.state.
            return;

        const draftState = draft === null
                ? this.state.getDraft()
                : draft
          , newState = draftState.metamorphose(dependencies)
          ;
        this._changeState(newState);
    }

    _changeState(newState) {
        if(this._lockChangeState !== null)
            throw new Error(`State change is locked with: ${this._lockChangeState}`);

        if(newState === this.state)
            return;
        // console.log('new app state', newState);
        if(newState.constructor !== this.state.constructor)
            throw new Error(`TYPE ERROR types don't match new state is ${newState} but this.state is ${this.state}.`);
        // get change information

        const compareResult = new StateComparison(this.state, newState)
          , statuses = new Set(compareResult.map(([status,,])=>status))
          ;
        // compareResult.toLog(compareResult);
        this.state = newState;

        // FIXME: missed root! ???
        if(statuses.size === 1 && statuses.has(COMPARE_STATUSES.EQUALS))
            return;
        // CAUTION: changeState must not be called in the update phase
        this._lockChangeState = 'changeState';
        try {
            this._ui.update(compareResult);
        }
        finally {
            this._lockChangeState = null;
        }
    }

    async _loadInitialResourcesFromPromises(...resources) {
        const byType = new Map();
        for(let [type, promise] of resources) {
            let list = byType.get(type);
            if(!list) {
                list = [];
                byType.set(type, list);
            }
            list.push(promise);
        }
        const types =  []
          , typeResults = []
          ;
        for(let type of byType.keys()) {
            let promise;
            switch(type) {
                case 'font':
                    promise = this._fontManager.loadInitialFontsFromFetchPromises(...byType.get(type))
                        .catch(error=>this.uiReportError('fontManager.loadInitialFontsFromFetchPromises', error));
                    break;
                case 'localFontStorage':
                    promise = byType.get(type)[0]
                        .then(localFontStorage=>this._fontManager.onLocalFontStorage(localFontStorage))
                        .then(()=>this._fontManager.loadInitialFontsFromLocalFontStorage());
                    break;
                case 'harfbuzz':
                    // falls through;
                case 'ready':
                    // We made sure in init to only add one of this.
                    promise = byType.get(type)[0];
                    break;
                default:
                    console.warn(`ATTEMPT TO LOAD  UNKOWN TYPE: ${type}`);
            }
            types.push(type);
            typeResults.push(promise);
        }

        return Promise.all(typeResults)
            .then(resolved=>new Map(zip(types, resolved)))
            .catch(error=>this.uiReportError('_loadInitialResourcesFromPromises', error));
    }

    reset() {
        // TODO: in Ramp Mode (ManualAxis + MultipleTargets but no
        // animation etc. this should re-init the proof and it's default
        // values ...
        // Also, trigger 'click' on keyFramesContainer.querySelector('li a')
        // is not ideal, as we should reset the value and have the UI follow.
        //
        // Maybe we can define his per Layout
    }
}
