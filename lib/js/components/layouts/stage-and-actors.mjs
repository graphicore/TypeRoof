/* jshint esversion: 11, browser: true, unused:true, undef:true, laxcomma: true, laxbreak: true, devel: true, elision: true*/
/* jshint -W008 */ // leading dot in decimals...
/* jshint -W028 */ // labels on if statement
import {
  //   Path
  // , getEntry
    ForeignKey
  // , unwrapPotentialWriteProxy
  // , StateComparison
   , CoherenceFunction
  // , BooleanModel
  , StringModel
  , NumberModel
  , ValueLink
  , InternalizedDependency
  , _AbstractStructModel
  , _AbstractOrderedMapModel
  , _AbstractDynamicStructModel
  , _AbstractListModel
  , _AbstractGenericModel
  // , _AbstractSimpleOrEmptyModel
  // , FreezableMap
  , StaticDependency
} from '../../metamodel.mjs';

import {
    _BaseContainerComponent
  , _BaseDynamicContainerComponent
  , _BaseComponent
} from '../basics.mjs';

import {
    StaticNode
} from '../generic.mjs';

import {
    _BaseLayoutModel
} from '../main-model.mjs';

export class _BaseActorModel extends _AbstractStructModel{}
const ActorTypeModel = _AbstractGenericModel.createClass('ActorTypeModel')// => .value will be a concrete _BaseActorModel
    // make this selectable...
  , AvailableActorTypeModel = _AbstractStructModel.createClass(
        'AvailableActorTypeModel'
      , ['label', StringModel]
      , ['typeClass', ActorTypeModel]
    )
  , AvailableActorTypesModel = _AbstractOrderedMapModel.createClass('AvailableActorTypesModel', AvailableActorTypeModel)
    // This is a very opaque way of creating instances for different
    // types.
  , ActorModel = _AbstractStructModel.createClass(
        'ActorModel'
        // TODO make a Type new StaticDependency('availableActorTypes', AvailableActorTypesModel, availableActorTypes)]
      , ['availableActorTypes', new InternalizedDependency('availableActorTypes', AvailableActorTypesModel)]
      , ['actorTypeKey', new ForeignKey('availableActorTypes', ForeignKey.NOT_NULL, ForeignKey.SET_DEFAULT_FIRST)]
      , ['actorTypeModel', new ValueLink('actorTypeKey')]
      // It would be nice if (something like) this could be the ActorModel
      // directly however, we'd loose the ability to allow based on the list.
      // Not sure if that is really important though, the list of
      , ['instance', _AbstractDynamicStructModel.createClass('DynamicActorModel'
                            , _BaseActorModel
                            ,'actorTypeModel' // this becomes a special dependency name
                            // This is a bit of a pain point, however, we
                            // can't collect these dependencies dynamically yet:
                            , ['availableActorTypes'/*, CYCLIC DEPENDENCIES ERROR: 'availableActors'*/])]
    )
      // This is the home for instances of actors.
      // Require named keys for actors to make them uniquely identifyable
      // but also human identifiable. This is different to KeyMomentsModel
      // where order is absolutly crucial information and labels can be not
      // unique. One result of this is however, that references to these
      // actors, when the key is renamed, should carefully be tracked and
      // renamed as well!
      // Another result is that UX must help users to understand the uniqueness
      /// requirements.
    , ActorsModel = _AbstractOrderedMapModel.createClass('ActorsModel', ActorModel)
      // This is very similar ActiveKeyMomentModel which was invented first
      // referencing an ActorModel item in ActorsModel with a 'state'
      // that is a _BaseActorModel
      // It is a _BaseActorModel so it can actually be referenced by it's
      // own type as well.
      // TODO: try and explain the behavior of recursive/self-references!
      // It's interesting though, as the metamodel likely has no issue with
      // this, but e.g. the UI and displaying/interpreting side could develop
      // issues.
    , ActorReferenceModel = _BaseActorModel.createClass(
        'ActorReferenceModel'
        // requires "actors" as a dependency from parent to be able to
        // point the ForeignKey into it we must define it as an InternalizedDependency
      , ['availableActors', new InternalizedDependency('availableActors', ActorsModel)]
        // This whole struct shouldn't exist if there's no actor
        // hence ForeignKey.NOT_NULL
      , ['key', new ForeignKey('availableActors', ForeignKey.NOT_NULL, ForeignKey.NO_ACTION)]
        // We are editing via this one I guess, editing also means to resolve
        // the link to get a proper draft from the parent that owns the actual
        // actor!
      , ['actor', new ValueLink('key')]
        // Depending on the use case we may want to store more data alongside.
        // e.g. x/y displacement or transformation matrix of an actor.
        //
        // When does the actor enter the stage? (default: t=0)
        // When does the actor leave the stage? (default t=1)
        // The above could be more sophisticated, the actor could be entereing
        // and leaving multiple times, but, that could also be done by
        // using multiple references.
        // It could also be realized using opacity, where a shortcut when
        // opacity is 0 would make sure the actor is not animated at all.
        // That way, stage presence can be implemented with key moments.
        // Otherwise, it could be a discrete number[0, 1] or a rounding
        // could be used.
        //
        // Mapping "global"-time-t to actor-t. E.g. the actor could
        // be playing in just a fraction of the stage time.
        // Also, t to actor-t: actor-t could be no-linear, could go backwards
        // etc. basically, we could have keyMoments to animate actorT.
        //
        // x and y: can be interpolated without any issues, rotation
        // would be more complex!
        // z: implementation dependent.
        //
        // scale: use one value as a uniform x/y scaling???
    )
  , ActorReferencesModel = _AbstractListModel.createClass('ActorReferencesModel', ActorReferenceModel)
    // A layer is a container or groupig for more actors.
    // could be called a "Group" in fact. Using "Layer" as it is a familiar
    // term for design tools. A "Group" is familiar as well, and I'm not
    // sure what the difference actually shold be, despite that the UIs
    // usually have less support for groups than for layers. It's
    // maybe a UI treatment difference.
  , LayerActorModel = _BaseActorModel.createClass(
        'LayerActorModel'
      , ['activeActors', ActorReferencesModel]
      , ['availableActors', new InternalizedDependency('availableActors', ActorsModel)]
        // this should also inherit or override all the properties.
        // especially size, x, y, z, t
    )
    // This is no meant as an eventual Actor, just to simply set up
    // without great complexity.
    // Just enough information to create:
    // <svg viewBox="0 0 100 100" xmlns="http://www.w3.org/2000/svg">
    //            <circle cx="50" cy="50" r="50" />
    // </svg>
    // where viewBox width/height = 2 * radius
  , CircleActorModel = _BaseActorModel.createClass(
        'CircleActorModel'
      , CoherenceFunction.create(
            ['x', 'y', 'radius']
          , function setDefaults({x, y, radius}) {
            if(x.value === undefined)
                x.value = 0;
            if(y.value === undefined)
                y.value = 0;
            if(radius.value === undefined)
                radius.value = 50;
        })
      , ['radius', NumberModel]
      , ['x', NumberModel]
      , ['y', NumberModel]
    )
  , availableActorTypes = (()=>{
        const actorTypes = [
                ['LayerActorModel', 'Layer', LayerActorModel]
                // there could be an alias (so users would find "Groups" as well
                // even though it is the same:
                // ['LayerActorModel', 'Group', LayerActorModel]
              , ['ActorReferenceModel', 'Reference', ActorReferenceModel]
              , ['CircleActorModel', 'Circle', CircleActorModel]
            ]
          , availableActorTypesDraft = AvailableActorTypesModel.createPrimalDraft({});
        for(const [key, label, Model] of actorTypes) {
            const availableActorType = AvailableActorTypeModel.createPrimalDraft({});
            availableActorType.get('typeClass').value = Model;
            availableActorType.get('label').value = label;
            availableActorTypesDraft.push([key, availableActorType]);
        }
        return availableActorTypesDraft.metamorphose();
    })()
  , StageAndActorsModel = _BaseLayoutModel.createClass(
        'StageAndActorsModel'
      , CoherenceFunction.create(
            ['width', 'height', 'availableActorTypes', 'availableActors', 'activeActors']
          , function setDefaults({width, height, availableActorTypes, availableActors, activeActors}) {
            // Value is undefined in primal state creation.
            // Also, NumberModel, an _AbstractGenericModel, has no defaults or validation.
            //
            // widht and heigth defaults could also be determined differently
            // this is simply to get started somewhere.
            if(width.value === undefined)
                width.value = 500;
            if(height.value === undefined)
                height.value = 500;

            // temporary to get started...
            if(!availableActors.size) {
                // VERY VERBOSE:
                // However, most of this will vanish in normal operation
                // as the draft will be already created etc.
                const getTypeFor=name=>availableActorTypes.get(name).value.get('typeClass').value
                  , getDraftFor=name=>getTypeFor(name).createPrimalDraft({availableActors})
                  , key = 'circle #1'
                  , circleTypeKey = 'CircleActorModel'
                  , circelDraft = getDraftFor(circleTypeKey)
                  , circleReferenceDraft = getDraftFor('ActorReferenceModel')
                  , actorDraft = ActorModel.createPrimalDraft({availableActorTypes})
                  ;
                actorDraft.get('actorTypeKey').value = circleTypeKey;
                actorDraft.get('instance').wrapped = circelDraft;
                circelDraft.get('x').value = 32;
                circelDraft.get('y').value = 32;
                circelDraft.get('radius').value = 123;
                availableActors.set(key, actorDraft);
                circleReferenceDraft.get('key').value = key;
                activeActors.push(circleReferenceDraft);
            }
        })
        // very similar to Layer, we could even think about
        // using something like ['baseLayer', LayerActorModel]
        // I'm currently thinking, this could also be a ActorsModel
        // and allow to define actors in place. Then it's only necessary
        // to put actors into availableActors when they will be used by
        // reference.
      , ['activeActors', ActorReferencesModel]
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
                      , availableActorTypes
                      )
      , ['availableActors', ActorsModel]
      , ['width', NumberModel]
      , ['height', NumberModel]
    )
  ;

// So, we want to get a t value from parent, as a dependency, but give
// another t value to the child, could be done in a coherence method
// where parentT => InternalizedDependency('t', NumberModel)
//       t=>NumberModel
// and the coherence function can do something to go from parentT to t
// BUT at this point there's a discrepance between actually stored values
// and calculated values required e.g. for rendereing, and it is time to
// implement something concrete!



/**
 * Similar to the concept Surfaces in Cairo
 * https://www.cairographics.org/manual/cairo-surfaces.html
 * this will be the rendering target. Likely each surface will have
 * it's own capabilties. It's interesting that HTML in general and also
 * SVG can host different technologies (HTML/CSS, SVG, Canvas2d/3d)
 * so maybe we can mix these surfaces eventually as well.
 */
// class SurfaceHTML extends _BaseComponent {
//     //jshint ignore:start
//     static TEMPLATE = `<div class="surface_html">
// </div>`;
//     //jshint ignore:end
//     constructor(parentAPI) {
//         super(parentAPI);
//         [this.element] = this.initTemplate();
//     }
//
//     initTemplate() {
//         const frag = this._domTool.createFragmentFromHTML(this.constructor.TEMPLATE)
//           , element = frag.firstElementChild
//           ;
//         return [element];
//     }
//
//     // activeActors
//     // width
//     // height
//     update(changedMap) {
//         changedMap.has('hello');
//     }
// }

/**
 * This is to set/manage the properties of a layer node.
 */
class LayerDOMNode extends StaticNode {
    constructor(parentAPI, node, cssClasses) {
        super(parentAPI, node);
        for(const className of ['stage_and_actors-layer', ...cssClasses])
            this.node.classList.add(className);
    }
    update(changedMap) {
        for(const property of ['width', 'height']){
            if(changedMap.has(property))
                // FIXME: CAUTION: the px unit should likely be configurable
                this.node.style.setProperty(property, `${changedMap.get(property).value}px`);
        }
    }
}
// const SVGNS = 'http://www.w3.org/2000/svg';
// xmlns="${SVGNS}"
class CircleActorRenderer extends _BaseComponent {
    // jshint ignore:start
     static TEMPLATE = `<svg
            viewBox="0 0 0 0"
        >
    <circle cx="0" cy="0" r="0" />
</svg>`;
    // jshint ignore:end
    constructor(parentAPI) {
        super(parentAPI);
        [this.element, this.circle] = this.initTemplate();
    }
    initTemplate() {
        const frag = this._domTool.createFragmentFromHTML(this.constructor.TEMPLATE)
          , element = frag.firstElementChild
          , circle = element.querySelector('circle')
          ;
        element.style.setProperty('position', 'absolute');
        this._insertElement(element);
        return [element, circle];
    }
    update(changeMap) {
        if(changeMap.has('radius')) {
            const radius = changeMap.get('radius').value;
            for(const [element, attr, value] of [
                    [this.element, 'viewBox', `-${radius} -${radius} ${2*radius} ${2*radius}`]
                  , [this.circle, 'r', `${radius}`]
            ]) {
                 element.setAttribute(attr, value);
            }
            this.element.style.setProperty('width', `${2*radius}px`);
            this.element.style.setProperty('height', `${2*radius}px`);
        }
        for(const [property, cssProperty] of [['x', 'left'], ['y', 'top']]) {
            if(!changeMap.has(property))
                continue;
            const value = changeMap.get(property).value;
            this.element.style.setProperty(cssProperty, `${value}px`);
        }
    }
}
/**
 * dynamically provision widgets for actors in rootPath + "activeActors"
 *
 * StageAndActorsModel has ActorReferencesModel activeActors
 * LayerActorModel has ActorReferencesModel activeActors
 */
class ActiveActorsRenderingController extends _BaseDynamicContainerComponent {
    // FIXME: a lot of this is copied from KeyMomentsController
    // so both should be taken to form a unified _BaseDynamicContainerComponent ...
    // This, however, is only READING for rendering, not writing so far
    // hence no need for a _redirectedGetEntry so far.


    /**
     * return => [settings, dependencyMappings, Constructor, ...args];
     */
    _getActorWidgetSetup(rootPath) {
        const actor = this.getEntry(rootPath)
          , typeKey = actor.get('actorTypeKey').value
          , actorTypeModel = actor.get('actorTypeModel')
          , typeLabel = actorTypeModel.get('label').value
          , typeClass = actorTypeModel.get('typeClass').value
          ;
        if(typeClass === CircleActorModel) {
            return [
                {
                    rootPath: rootPath.append('instance')
                  , zone: 'layer'
                }
            , [ 'x', 'y', 'radius' ]
            , CircleActorRenderer
            ];
        }
        throw new Error(`NOT IMPLEMENTED _getActorWidgetSetup for typeClass: ${typeClass.name} label: "${typeLabel}" key: ${typeKey}`);
    }
    _createWrapper(rootPath) {
        const
            // how does this work?
            //,  childParentAPI = Object.assign(Object.create(this._childrenParentAPI), {
            //     // Ideally, the link, when trying to write to it,
            //     // e.g. in draft mode when reading from it and returning
            //     // the PotentialWriteProxy could use the linking information
            //     // to return a proxy for the correct entry in the source
            //     // but this may be complicated or really hard to accomplish
            //     // should be looked into though! In here, it's easier to
            //     // resolve the link, because the source is known and the
            //     // parent is known. Keeping track of a dependency's source
            //     // is thus maybe the main issue.
            //     //
            //     // FIXME: works so far, but requires the getEntry workaround.
            //     getEntry: this._redirectedGetEntry.bind(this)
            // })
            childParentAPI = this._childrenParentAPI
            // , args = [this._zones]
          , [settings, dependencyMappings, Constructor, ...args] = this._getActorWidgetSetup(rootPath)
          ;
        return this._initWrapper(childParentAPI, settings, dependencyMappings, Constructor, ...args);
    }
}

/**
 * Orchestrate the own layer properties and the containg actor widgets.
 */
class SurfaceHTML extends _BaseContainerComponent {
    constructor(parentAPI, _zones, baseCLass) {
        // for the main stage container:
        //      position: relative
        //      overflow: hidden
        const layerElement = parentAPI.domTool.createElement('div')
            // override any "layer" if present
            // but this means we can't put our layer into the present layer
            // ...
          , zones = new Map([..._zones, ['layer', layerElement], ['parent-layer', _zones.get('layer')]])
          ;
        layerElement.classList.add(baseCLass);
        // calling super early without widgets is only required when
        // the widgets definition requires the `this` keyword.

        const widgets = [
            [
                // This will act as a placeholder/container element.
                // It also takes care that the element is inserted and
                // later removed again.
                {zone: 'parent-layer'}
              , [
                    'width', 'height'
                ]
              , LayerDOMNode
              , layerElement
              , [baseCLass]
            ]
          , [
                {}
              , [
                    ['activeActors', 'collection']
                ]
              , ActiveActorsRenderingController
              , zones
              , ['actor']
            ]
        ];
        super(parentAPI, zones, widgets);
    }
}

class StageAndActorsController extends _BaseContainerComponent {
    constructor(parentAPI, _zones) {
        const zones = new Map([..._zones, ['layer', _zones.get('before-layout')]])
          , widgets = [
                [
                    {}
                  , []
                  , SurfaceHTML
                  , zones
                  , 'stage_and_actors'
                ]
            ]
          ;
        super(parentAPI, zones, widgets);
    }
}

export {
    StageAndActorsModel as Model
  , StageAndActorsController as Controller
};
