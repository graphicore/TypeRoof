/* jshint esversion: 11, browser: true, unused:true, undef:true, laxcomma: true, laxbreak: true, devel: true */

import {
       unwrapPotentialWriteProxy
      , _AbstractStructModel
      // , _AbstractListModel
      //, _AbstractMapModel
      , _AbstractOrderedMapModel
      , _AbstractDynamicStructModel
      , _AbstractGenericModel
      , ForeignKey
      , ValueLink
      // , BooleanModel
      // , NumberModel
      , StringModel
      , InternalizedDependency
      , CoherenceFunction
     } from '../metamodel.mjs';

// This could just be _AbstractStructModel so far, however testing the
// inheritance experience with this. It seems to work nicely so we can use
// this as a marker class, and maybe at some point add specific behavior.
export class _BaseLayoutModel extends _AbstractStructModel{}

export const InstalledFontModel = _AbstractGenericModel.createClass('InstalledFontModel')
  , DeferredFontModel = _AbstractGenericModel.createClass('DeferredFontModel')
  , LayoutTypeModel = _AbstractGenericModel.createClass('LayoutTypeModel')// => value will be a concrete _BaseLayoutModel
  , AvailableLayoutModel = _AbstractStructModel.createClass(
        'AvailableLayoutModel'
      , ['label', StringModel]
      , ['typeClass', LayoutTypeModel]
    )
  , AvailableLayoutsModel = _AbstractOrderedMapModel.createClass('AvailableLayoutsModel', AvailableLayoutModel)
  , AvailableFontsModel = _AbstractOrderedMapModel.createClass('AvailableFontsModel', DeferredFontModel)
  , InstalledFontsModel = _AbstractOrderedMapModel.createClass('InstalledFontsModel', InstalledFontModel)
  , ApplicationModel = _AbstractStructModel.createClass(
        'ApplicationModel'
      , CoherenceFunction.create(['activeState', 'layoutTypeModel'],  function checkTypes({activeState, layoutTypeModel}) {
            // console.info('CoherenceFunction checkTypes activeState', activeState);
            // console.info('CoherenceFunction checkTypes layout', layout);
            const LayoutType = layoutTypeModel.get('typeClass').value
              , WrappedType = unwrapPotentialWriteProxy(activeState).WrappedType
              ;

            // This check could be executed after activeState was
            // metamorphosed with it's current type dependency, but it is not.
            if(WrappedType !== LayoutType)
                // throw new ... ?
                // Actually, this is taken care of when metamorphosing
                // the state. However, if done here, we could also change
                // it in here while still a draft. Would require a public
                // API to do so, however as setting to _value directly is
                // not ideal:
                // Object.defineProperty(activeState, '_value',{
                //      value: LayoutType.createPrimalState(childDependencies)
                //      ...
                // We have a setter: activeState.wrapped = this.WrappedType.createPrimalState(childDependencies)
                // HOWEVER, that also checks for WrappedType which wouldn't
                // work, because that is changed only in metmorphose as well!
                // We should only check for consistency with activeState.constructor.BaseType
                console.warn(`TYPE WARNING activeState wrapped type "${WrappedType.name}" `
                        + `must equal layout type "${layoutTypeModel.get('label').value}" (${LayoutType.name})`);
        })
      , ['availableLayouts', new InternalizedDependency('availableLayouts', AvailableLayoutsModel)]
      , ['activeLayoutKey', new ForeignKey('availableLayouts', ForeignKey.NOT_NULL, ForeignKey.SET_DEFAULT_LAST)]
      , ['layoutTypeModel', new ValueLink('activeLayoutKey')]
      , ['activeState', _AbstractDynamicStructModel.createClass('DynamicLayoutModel'
                            , _BaseLayoutModel, 'layoutTypeModel'
                            // This is a bit of a pain point, however, we
                            // can't collect these dependencies dynamically yet.
                            , ['font', 'installedFonts'])]
      , ['availableFonts', new InternalizedDependency('availableFonts', AvailableFontsModel)]
      , ['installedFonts', new InternalizedDependency('installedFonts', InstalledFontsModel)]
      , ['activeFontKey', new ForeignKey('installedFonts', ForeignKey.NOT_NULL, ForeignKey.SET_DEFAULT_FIRST)]
      , ['font', new ValueLink('activeFontKey')] // => provides one FontModel of AvailableFontsModel
    )
  ;

