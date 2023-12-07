/* jshint esversion: 11, browser: true, unused:true, undef:true, laxcomma: true, laxbreak: true, devel: true, elision: true*/
/* jshint -W008 */ // leading dot in decimals...
/* jshint -W028 */ // labels on if statement
import {
//    Path
//  , getEntry
//  , ForeignKey
  // , unwrapPotentialWriteProxy
//  , StateComparison
    CoherenceFunction
//  , StringModel
  , NumberModel
//  , _AbstractDynamicStructModel
  , _AbstractGenericModel
  , _AbstractSimpleOrEmptyModel
//  , _AbstractEnumModel
  , StaticDependency
//  , getMinMaxRangeFromType
//  , _BaseSimpleModel
//  , _BaseContainerModel
//  , BooleanModel
//  , BooleanDefaultTrueModel
//  , FreezableSet
} from '../../metamodel.mjs';

import {
     zip
//   , enumerate
//   , mapValueToRange
} from '../../util.mjs';

import {
    _BaseContainerComponent
//  , _BaseDynamicCollectionContainerComponent
//  , _BaseComponent
//  , _CommonContainerComponent
//  , UPDATE_STRATEGY
  , UPDATE_STRATEGY_COMPARE // jshint ignore:line
  , UPDATE_STRATEGY_NO_UPDATE // jshint ignore:line
//  , HANDLE_CHANGED_AS_NEW
} from '../basics.mjs';

// import {
//     StaticNode
//   , DynamicTag
//   , StaticTag
//   , UINumberInput
//   , PlainNumberAndRangeInput
//   , PlainToggleButton
//   , PlainNumberAndRangeOrEmptyInput
//   , UINumberAndRangeOrEmptyInput
//   , UILineOfTextInput
//   , UILineOfTextOrEmptyInput
//   , GenericSelect
//   , UISelectInput
//   , UISelectOrEmptyInput
//   , PlainSelectInput
//   , UIToggleButton
//   , UICheckboxOrEmptyInput
// } from '../generic.mjs';

import {
    _BaseLayoutModel
} from '../main-model.mjs';

// import {
//     FontSelect
// } from '../font-loading.mjs';

 import {
    timeControlModelMixin
  , AnimationTGenerator
  , UITimeControlCircle
//   , UIActorTimeControlKeyMomentSelectCircle
  , getBasicPlayerControlWidgets
//   , LocalScopeAnimanion
   , AnimationLiveProperties
//   , AnimationInfo
//   , binarySearch
  , AnimationPropertiesProtocolHandler
 }  from '../animation-fundamentals.mjs';

//import {
//    createLabelForKeyMoment
//} from './example-key-moments.mjs';

//import {
//    UIManualAxesLocations
//  , AxesLocationsModel
//} from '../ui-manual-axis-locations.mjs';

//import {
//    formatCss as culoriFormatCss
//  , getMode as culoriGetMode
//  , converter as culoriConverter
//  , interpolate as culoriInterpolate
//  , fixupHueShorter
//  , fixupHueLonger
// , fixupHueDecreasing
//  , fixupHueIncreasing
//} from '../../vendor/culori/bundled/culori.mjs';

import {
//    COLOR_TYPE_TO_CULORI_MODE
//  , PECENTAGE_UNIT_NUMBER_TYPES
//  , TURN_UNIT_NUMBER_TYPES
//  , _BaseColorModel
//  , ColorModel
    AvailableColorTypesModel
  , availableColorTypes
//  , culoriValuesToColorValuesRange
//  , culoriToColor
//  , getColorFromPropertyValuesMap
// , colorToCss
} from '../color.mjs';

import {
    ActorsModel
  , AvailableActorTypesModel
//  , createActor
} from '../actors/actors-base.mjs';

import {
    TypographyKeyMomentsModel
//   , FontSizeModel
} from '../actors/models.mjs';

import {
     activatableActorTypes
   , getActorWidgetSetup
//   , getActorTreeNodeType
//   , isTypographicActorTypeKey
//   , getActorTypeKeySpecificWidgets
} from '../actors/available-actors.mjs';

// import {
//     CONTAINER_TASK_AUTOMATIONS
// } from  '../task-automations/container-task-automations.mjs';

// import {
//     REGISTERED_PROPERTIES
//   , getRegisteredPropertySetup
// } from '../actors/stage-registered-properties.mjs';

// import {
//     StageDOMNode
// } from '../actors/stage.mjs';

// import {
//     ActiveActorsRenderingController
// } from '../actors/active-actors-rendering-controller.mjs';


// import {
//     UISelectCharGroupInput
//   , UISelectCharGroupOrEmptyInput
//   , getExendedChars
//   , getCharsForSelectUI
// } from '../ui-char-groups.mjs';

// import {
//     CharGroupOptionsModel
//   , CharGroupModel
// } from '../actors/videoproof-array.mjs';

import {
    ContainerMeta
  , initAnimanion
  , isInheritingPropertyFn
  , UICharGroupContainer
} from './stage-and-actors.mjs';


const VideoproofArrayActorModel = activatableActorTypes.get('VideoproofArrayActorModel').get('typeClass').value;

// START will be a module for calculateRegisteredKeyframes
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


// END will be a module for calculateRegisteredKeyframes


    // TODO: _AbstractTypedModel('PathModel', Path) => would be simple!
const PathModel = _AbstractGenericModel.createClass('PathModel')
  , VideoproofArrayModel = _BaseLayoutModel.createClass(
        'VideoproofArrayModel'
      , ...timeControlModelMixin
         // same as in_BaseActorModel, but this is not an actor,
         // these properties are the root of the inheritance.
      , ['keyMoments', TypographyKeyMomentsModel]
      , CoherenceFunction.create(
            ['width', 'height'/*, 'availableActorTypes', 'activeActors', 'font', 'installedFonts'*/]
          , function setDefaults({width, height /*, availableActorTypes, activeActors, font, installedFonts*/}) {
            // Value is undefined in primal state creation.
            // Also, NumberModel, an _AbstractGenericModel, has no defaults or validation.
            //
            // widht and heigth defaults could also be determined differently
            // this is simply to get started somewhere.
            if(width.value === undefined)
                width.value = 720; // 1080;
            if(height.value === undefined)
                height.value = 720; // 1080;
        })
        // very similar to Layer, we could even think about
        // using something like ['baseLayer', LayerActorModel]
        // I'm currently thinking, this could also be a ActorsModel
        // and allow to define actors in place. Then it's only necessary
        // to put actors into availableActors when they will be used by
        // reference.
      , ['activeActors', ActorsModel]
        // ok, we need to select from somewhere an available type
        // maybe, this can be a permanent, local (injected here?) dependency
        // not one that is injected via the shell. Unless, we start to
        // add actors in a plugin-way, like it is planned for layouts ...
        // TODO:
        // FIXME: removed the type for this StaticDependency definition,
        // which would be "AvailableActorTypesModel", as it gets a direct
        // value and that is whatever type it is. It should be immutable
        // for sure.
        // FIXME: Other dependencies, however, should also be defined with
        // a type, so we can always be sure to receive the expected type.
        // Maybe also some (rust) trait-like description of required
        // fields and their types could be helpful for this, so stuff
        // can be similar but is not bound to the actual same type.
        // static dependeny could as implementation always be applied to
        // the dependencies dict after collecting external dependencies,
        // then, treat it as InternalizedDependency...
      , ... StaticDependency.createWithInternalizedDependency(
                        'availableActorTypes'
                      , AvailableActorTypesModel
                      , activatableActorTypes
                      )
        // , ... StaticDependency.createWithInternalizedDependency(
        //                   'referencableActorTypes'
        //                 , AvailableActorTypesModel
        //                 , referencableActorTypes
        //                 )
        // , ['referencableActors', ReferencableActorsModel]
      , ... StaticDependency.createWithInternalizedDependency(
                        'availableColorTypes'
                      , AvailableColorTypesModel
                      , availableColorTypes
                      )
      , ['videoproofArray', VideoproofArrayActorModel]
      , CoherenceFunction.create(
            ['videoproofArray' , 'font'/*, 'availableActorTypes', 'activeActors', 'font', 'installedFonts'*/]
          , function initVideoproofArray({videoproofArray, font}) {
            const keyMoments = videoproofArray.get('keyMoments')
              , KeyMomentModel = keyMoments.constructor.Model
              , needInitialKeymoment = keyMoments.size === 0
                // Very nice that we can detect this here.
                // The videoproofArray.dependencies could also be set
                // e.g. by a user interface and it could confuse this
                // detection heuristic, however, we don't plan to
                // do this.
              , fontHasChanged = videoproofArray.dependencies.font !== font
              , needNewKeyMoments = needInitialKeymoment || fontHasChanged
              ;
            if(needInitialKeymoment) {
                // This is initial. We'll always require a keyMoment  at 0
                const newKeyMoment = KeyMomentModel.createPrimalDraft(keyMoments.dependencies)
                  , defaultCharGroup = KeyMomentModel.fields.get('charGroup').fields.get('options').Model.defaultValue
                  ;
                newKeyMoment.get('charGroup').get('options').set(defaultCharGroup);
                keyMoments.push(newKeyMoment);
                console.log('CoherenceFunction setDefaultsVideoproofArray videoproofArray', videoproofArray, 'keyMoments', keyMoments);
            }
            if(needNewKeyMoments) {
                // TODO: we'll have to reset the KeyMoments here, to match
                // the new axis of the new font.
                console.log('CoherenceFunction setDefaultsVideoproofArray font changed'
                          , '\n>from', videoproofArray.dependencies.font.value.fullName
                          , `\n>to`, font.value.fullName
                            // TODO: do we need to define new dependencies for this, so it
                            // can trickle down ... ?
                            // It takes:  installedFonts, font, availableColorTypes
                            // but probably the default mechanism will do just fine and update
                            // the dependencies just fine when metamorphosing the
                            // drafts into states.
                          , '\n videoproofArray.dependencies:', videoproofArray.dependencies);
                // create the pure key moment locations and labels

                // Remove all keyMoments but the first. Keep the charGroups,
                // we want to retain that setting. Maybe there will be other
                // settngs we'll want to keep as well. We could alternatively
                // keep the first keyMoment and just update the locations
                // and labels, maybe that's less fuzz, but could also have
                // side effects.
                const keeperKeys = ['charGroup']
                  , keepers = []
                  , newKeyMoments = []
                  ;
                {
                    const firstKeyMoment = keyMoments.get(0);
                    keepers.push(...keeperKeys.map(k=>[k, firstKeyMoment.get(k)]));
                }
                keyMoments.splice(0, Infinity);
                for(const locations of calculateRegisteredKeyframes(font.value.axisRanges)) {
                    //     create the new keyMoment
                    //     set the label to the keymoment
                    //     set the axes locations to the key moment
                    const keyMoment = KeyMomentModel.createPrimalDraft(keyMoments.dependencies)
                          // opsz 8, wdth 100, wght 400
                      , label = locations.map(([axisTag, location])=>`${axisTag} ${location}`).join(', ')
                      , axesLocations = keyMoment.getDraftFor('axesLocations')
                      ;
                    keyMoment.get('label').value = label;
                    axesLocations.arraySplice(0, Infinity);
                    for(const [axisTag, location] of locations)
                        axesLocations.setSimpleValue(axisTag, location);
                    newKeyMoments.push(keyMoment);
                }
                keyMoments.push(...newKeyMoments);
                const newFirstKeyMoment = keyMoments.get(0);
                keepers.map(([k,v])=>newFirstKeyMoment.set(k, v));
            }
        })
      , ['width', NumberModel]
      , ['height', NumberModel]
      , ['editingActor', _AbstractSimpleOrEmptyModel.createClass(PathModel)]
    )
  ;

const _NOTDEF = Symbol('_NOTDEF');
class VideoproofArrayController extends _BaseContainerComponent {
    constructor(parentAPI, zones) {
        super(parentAPI, zones);
        parentAPI.wrapper.setProtocolHandlerImplementation(
            ...AnimationPropertiesProtocolHandler.create('animationProperties@'));
        // original: this._animationPropertiesKey = `animationProperties@${this.parentAPI.rootPath.append('..', '..')}`;
        // old: const animationPropertiesKey = parentAPI.rootPath.append('videoproofArray').toString()
        const animationPropertiesKey = `animationProperties@${parentAPI.rootPath.append('videoproofArray')}`
          , updateDefaultsDependencies = [
                [animationPropertiesKey, '@animationProperties']
            ]
          , _updateDefaultsNames = new Set(Array.from(zip(...updateDefaultsDependencies))[1])
          , requireUpdateDefaults = changedMap=>Array.from(changedMap.keys())
                                        .some(name=>_updateDefaultsNames.has(name))
          , propertyRoot = 'generic/charGroup/'
         ;

        // animationProperties@/activeState/videoproofArray
        const widgets = [
            [
                {}
              , [ 't', 'duration', 'playing', 'perpetual']
              , AnimationTGenerator
            ]
          , [
                {}
              , [
                    ['t', 'globalT'], 'keyMoments', 'isLoop'
                    // NOT required as this is the root. However, it could
                    // be used here as well e.g. to inject global defaults'.
                    // parent is always two levels above from here
                    // as this is {index}/instance
                    //, [`animationProperties@${parentAPI.rootPath.append('..', '..')}`, '@parentProperties']
                ]
              , ContainerMeta
              , zones
            ]
          , ...Object.entries(getBasicPlayerControlWidgets({zone: 'before-layout'}))
                                    .filter(([k,/*v*/])=>k!=='isLoop').map(([k,v])=>v)
          , [
                {zone: 'main'}
              , [
                    't', 'playing'
                ]
              , UITimeControlCircle
            ]
          , [
                {
                    'animationProperties@': animationPropertiesKey
                }
              , [
                    //...parentAPI.wrapper.getDependencyMapping(parentAPI.wrapper.constructor.DEPENDECIES_ALL)
                    ['t', 'globalT'], ['videoproofArray/keyMoments', 'keyMoments'], ['videoproofArray/isLoop', 'isLoop'] // same as in ContainerMeta!
                    // changedMap.has('keyMoments') || changedMap.has('isLoop') || changedMap.has('@parentProperties')
                ]
              , AnimationLiveProperties
              , initAnimanion // This usage instance won't receive parentProperties.
              , isInheritingPropertyFn
            ]
          , getActorWidgetSetup({
                typeKey: 'VideoproofArray' // ?
              , typeLabel: 'Videoproof Array' // ?
              , typeClass: VideoproofArrayActorModel
              , widgetRootPath: parentAPI.rootPath.append('videoproofArray')
              , zones: new Map([...zones, ['layer', zones.get('layout')]])
              , get layerBaseClass() {throw new Error('NOT IMPLEMENTED get layerBaseClass');}
              , getActorWidgetSetup() {throw new Error('NOT IMPLEMENTED getActorWidgetSetup');}
            })
          , [
                {
                    rootPath: parentAPI.rootPath.append('videoproofArray', 'keyMoments', '0', 'charGroup')
                }
              , []
              , UICharGroupContainer
              , zones
              , {
                    // not implemented: _getArgumentConfig http://localhost:8080/lib/js/components/layouts/stage-and-actors.mjs:2771
                    updateDefaultsDependencies
                    // not implemented: _getArgumentConfig http://localhost:8080/lib/js/components/layouts/stage-and-actors.mjs:2775
                  , requireUpdateDefaults
                    // get: not implemented: UICharGroupContainer http://localhost:8080/lib/js/components/layouts/stage-and-actors.mjs:2955
                    // use: not implemented:  _activateCustom http://localhost:8080/lib/js/components/layouts/stage-and-actors.mjs:3020
                    // Uncaught (in promise) Error: not implemented: get getDefaults(prefix:string:generic/charGroup, key:string:options, defaultVal:object:null)
                  , getDefaults: function(prefix, key, defaultVal=_NOTDEF) {
                        // similar to KeyMomentController._getDefaults
                        const fullKey = `${prefix}${key}`
                          , liveProperties = this.getEntry(this._animationPropertiesKey)
                          , activeKey = '0' // hard coded, here always the first key moment  //this.parentAPI.rootPath.parts.at(-1)
                          , propertyValues = liveProperties.getPropertyValuesMapForKeyMoment(activeKey)
                          ;
                        //.localAnimanion, 'keyMomentsKeyToT:', liveProperties.localAnimanion.keyMomentsKeyToT);
                        if(propertyValues.has(fullKey)){
                            return propertyValues.get(fullKey);
                        }
                        if(defaultVal !== _NOTDEF) {
                            return defaultVal;
                        }
                        throw new Error(`KEY ERROR ${this}._getDefaults: not found "${fullKey}" for ${activeKey} in ${liveProperties}`);
                    }.bind(this)
                }
              , propertyRoot
              , 'Glyphs:'
            ]
        ];

        console.log('widgets:', widgets);
        this._initWidgets(widgets);
        this._animationPropertiesKey = animationPropertiesKey;
    }
    update(...args) {
        this.parentAPI.wrapper.getProtocolHandlerImplementation('animationProperties@').resetUpdatedLog();
        super.update(...args);
    }
    initialUpdate(...args) {
        this.parentAPI.wrapper.getProtocolHandlerImplementation('animationProperties@').resetUpdatedLog();
        super.initialUpdate(...args);
    }
}

export {
    VideoproofArrayModel as Model
  , VideoproofArrayController as Controller
};
