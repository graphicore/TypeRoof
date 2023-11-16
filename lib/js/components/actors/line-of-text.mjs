/* jshint esversion: 11, browser: true, unused:true, undef:true, laxcomma: true, laxbreak: true, devel: true, elision: true*/
/* jshint -W008 */ // leading dot in decimals...
/* jshint -W028 */ // labels on if statement

import {
    _BaseActorModel
  , genericActorMixin
} from './actors-base.mjs';

import {
    TypeSettingKeyMomentsModel
  , typographyActorMixin
} from './models.mjs';

import {
    _BaseComponent
} from '../basics.mjs';

import {
    getPropertyValue
  , actorApplyCSSColors
  , actorApplyCssProperties
  , DYNAMIC_MARKER
  , cssPositioningHorizontalPropertyExpander
  , setTypographicPropertiesToSample
} from './properties-util.mjs';

import {
    getRegisteredPropertySetup
} from './stage-registered-properties.mjs';

export const LineOfTextActorModel = _BaseActorModel.createClass(
    'LineOfTextActorModel'
    , ...genericActorMixin
    , ['keyMoments', TypeSettingKeyMomentsModel]
    , ...typographyActorMixin
    // textRun is now is KeyMoments and used instead
    // , CoherenceFunction.create(
    //       ['text']
    //     , function setDefaults({text}) {
    //       if(text.value === undefined)
    //           text.value = 'Sample Text';
    //   })
    // , ['text', StringModel]
);

export class LineOfTextActorRenderer  extends _BaseComponent {
    // jshint ignore:start
     static TEMPLATE = `<span class="actor_renderer-line_of_text">(content not initialized)</span>`;
    // jshint ignore:end
    constructor(parentAPI) {
        super(parentAPI);
        [this.element] = this.initTemplate();
    }
    initTemplate() {
        const frag = this._domTool.createFragmentFromHTML(this.constructor.TEMPLATE)
          , element = frag.firstElementChild
          ;
        element.style.setProperty('position', 'absolute');
        this._insertElement(element);
        return [element];
    }

    update(changedMap) {
        const propertiesData = [
                [DYNAMIC_MARKER, 'numericProperties/x', 'generic/positioningHorizontal', 'px']
              , [DYNAMIC_MARKER, 'numericProperties/y', 'generic/positioningVertical', cssPositioningHorizontalPropertyExpander, 'px']
              , ['numericProperties/width', 'width', 'px']
              , ['numericProperties/height', (element, value, propertiesValueMap, getDefault, useUnit)=>{
                    let value_;
                    if(value == '') {
                        const [, heightTreatment] = getPropertyValue(
                                              propertiesValueMap, getDefault
                                            , 'generic/heightTreatment');
                        // FIXME: in this case, if positioningVertical is not
                        // set explicitly, it should default to bottom.
                        value_ =  heightTreatment === 'baselineToBottomFix'
                            ? 'calc(1em * var(--ascender) / var(--units-per-em))'
                            : ''
                            ;
                    }
                    else
                        value_ = value;
                    element.style.setProperty('height', `${value_}${useUnit ? 'px' : ''}`);
                }]
              , ['numericProperties/height', 'height', 'px']
                // Doubling height as line-heigth, only makes (partially)
                // sense because this is indeed just a single line of text.
              // , ['numericProperties/height', 'line-height', 'px']
              , ['numericProperties/z-index', 'z-index', '',  Math.round]
              , ['generic/textAlign', 'text-align', '']
              , ['generic/direction', 'direction', '']
        ];

        if(changedMap.has('font')) {
            // This also triggers when font changes in a parent trickle
            // down, so these properties should always be set correctly.
            const font = changedMap.get('font').value;
            this.element.style.setProperty('font-family', `"${font.fullName}"`);
            this.element.style.setProperty('--units-per-em', `${font.fontObject.unitsPerEm}`);
            this.element.style.setProperty('--ascender', `${font.fontObject.ascender}`);
            this.element.style.setProperty('--descender', `${font.fontObject.descender}`);
        }

        if(changedMap.has('@animationProperties') || changedMap.has('globalT')) {
            const animationProperties = changedMap.has('@animationProperties')
                        ? changedMap.get('@animationProperties')
                        : this.getEntry('@animationProperties')
              , globalT = (changedMap.has('globalT')
                        ? changedMap.get('globalT')
                        : this.getEntry('globalT')).value
              , propertyValuesMap = animationProperties.animanion.getPropertiesFromGlobalT(globalT)
              // , getDefault = property => [true, _getRegisteredPropertySetup(property).default]
              , getDefault = property => {
                    if('numericProperties/width' ===  property
                        || 'numericProperties/height' ===  property
                    )
                        return [false, ''];
                    return [true, getRegisteredPropertySetup(property).default];
                }
              , colorPropertiesMap = [
                      ['colors/backgroundColor', 'background-color']
                    , ['colors/textColor', 'color']
                ]
              ;

            if((propertyValuesMap.has('generic/textRun')))
                this.element.textContent = propertyValuesMap.get('generic/textRun');
            else
                this.element.textContent = '';

            actorApplyCSSColors(this.element, propertyValuesMap, getDefault, colorPropertiesMap);
            //  set properties to sample...
            // console.log(`${this.constructor.name}.update propertyValuesMap:`, ...propertyValuesMap);
            // Everything below can basically go only into this blog, as there
            // won't be the bottom kind of properties, at least not for
            // the example
            // console.log(`${this}.update(${[...changedMap.keys()].join(', ')}), propertyValuesMap:`, ...propertyValuesMap);
            // FIXME: also properties that are not explicitly set in here
            // should have a value!
            actorApplyCssProperties(this.element, propertyValuesMap, getDefault, propertiesData);
            setTypographicPropertiesToSample(this.element, propertyValuesMap);
        }
    }
}
