/* jshint esversion: 11, browser: true, unused:true, undef:true, laxcomma: true, laxbreak: true, devel: true */
/* jshint -W008 */ // leading dot in decimals...

import {
    _BaseComponent
  // , _BaseContainerComponent
  // , UPDATE_STRATEGY
  // , UPDATE_STRATEGY_SIMPLE // jshint ignore: line
} from './basics.mjs';

export class GenericSelect extends _BaseComponent {
    // jshint ignore:start
    static TEMPLATE = `<label class="ui_generic_select">
    <span class="ui_generic_select-label">Something</span>
    <select class="ui_generic_select-select"></select>
</label>`;
    static NULL_SELECT_VALUE= '[_NULL_]';
    // jshint ignore:end
    constructor(parentAPI, baseClass, labelContent, optionGetLabel, allowNull=[], onChangeFn=null) {
        super(parentAPI);
        if(optionGetLabel)
            this._optionGetLabel = optionGetLabel;
        [this._allowNull=false, this._allowNullLabel='(no selection)', this._nullModelValue=null] = allowNull;
        this._onChangeFn = onChangeFn;
        [this.element, this._label, this._select] = this.initTemplate(baseClass, labelContent);
    }
    initTemplate(baseClass, labelContent) {
        const frag = this._domTool.createFragmentFromHTML(this.constructor.TEMPLATE)
          , element = frag.querySelector('.ui_generic_select')
          , label = frag.querySelector('.ui_generic_select-label')
          , select = frag.querySelector('.ui_generic_select-select')
          ;
        element.classList.add(`${baseClass}`);
        label.classList.add(`${baseClass}-label`);
        this._domTool.clear(label);
        label.append(labelContent);
        select.classList.add(`${baseClass}-select`);

        this._insertElement(element);
        select.addEventListener('change', this._changeStateHandler((/*event*/)=>{
            // const value = this.getEntry('value');
            // value.set(this._select.value);
            const value = this._allowNull && this._select.value === this.constructor.NULL_SELECT_VALUE
                ? this._nullModelValue
                : this._select.value
                ;
            this.getEntry('value').set(value);

            // could do more e.g.:
            // const options = this.parentAPI.getEntry('options');
            // deleted = options.arraySplice(0, 3);
            if(this._onChangeFn)
                this._onChangeFn(value);
        }));
        return [element, label, select];
    }

    update(changed) {
        // Should probably use availableFonts and activeFontKey
        // directly in this case, but for more generic interfaces,
        // it is important that we can rewrite names from external
        // model names to internal widget names. So I can start with
        // as well righ now.
        if(changed.has('options'))
            this._updateOptions(changed.get('options'));
        if(changed.has('value'))
            this._updateValue(changed.get('value'));
    }

    /* Override via constructor. */
    _optionGetLabel(key/*, value*/){
        return key;
    }

    _updateOptions(availableOptions/* changes */) {
        // Just rebuild all options, it's straight forward
        const value = this._select.value // keep around to set back later
          , options = []
          , createOption=(value, label)=>{
                const option = this._domTool.createElement('option');
                option.value = value;
                option.textContent = label;
                options.push(option);
            }
          ;
        if(this._allowNull)
            createOption(this.constructor.NULL_SELECT_VALUE, this._allowNullLabel);
        for(const [key, value] of availableOptions) {
            const label = this._optionGetLabel(key, value);
            createOption(key, label);
        }
        this._domTool.clear(this._select);
        this._select.append(...options);
        // Set back original value, if this is not available, it has changed
        // and the new value will be set by the shell.
        this._select.value = value;
    }
    // Should be called after updateOptions if that was necessary, as
    // the new options may no longer contain the old value.
    _updateValue(activeKey) {
        this._select.value = this._allowNull && activeKey.value === this._nullModelValue
                ? this.constructor.NULL_SELECT_VALUE
                : activeKey.value.toString()
                ;
    }
}

// This could also be implemented as radio button list.
export class PlainSelectInput {
        // jshint ignore:start
    static TEMPLATE = `<label class="ui_plain_select">
    <span class="ui_plain_select-label">(not initialized)</span>
    <select class="ui_plain_select-select"></select>
</label>`;
    // jshint ignore:end
    constructor(domTool, changeHandler, label, items) {
        this._domTool = domTool;
        this._passive = false;
        [this.element, this._input] = this._initTemplate(label, items);

        this._changeHandler = null;
        if(changeHandler) {
            this._changeHandler = (event)=>{
                event.preventDefault();
                changeHandler(this._input.value);
            };
            this._input.addEventListener('change', this._changeHandler);
        }
    }

    _initTemplate(label, items) {
        const container = this._domTool.createFragmentFromHTML(this.constructor.TEMPLATE).firstElementChild
          , input = container.querySelector('.ui_plain_select-select')
          , labelElement = container.querySelector('.ui_plain_select-label')
          , options = []
          ;
        for(const [key, label] of items.entries()) {
             const option = this._domTool.createElement('option',{}, label);
             option.value = key;
             options.push(option);
        }
        input.append(...options);
        labelElement.textContent = label;
        return [container, input];
    }

    update(value) {
        this._input.value = value;
    }

    set passive(val) {
        this._passive = !!val;
        this._input.disabled = this._passive;
    }

    get passive() {
        return this._passive;
    }

    setDisplay(show) {
        if(show)
            this.element.style.removeProperty('display');
        else
            this.element.style.display = 'none';
    }
}

/* Useful helper but may have room for improvement. */
function _getInputStepsSizeForMinMax(min, max) {
    let distance = Math.abs(min - max);
    if(distance >= 100) {
        return '1'; //10 ** 0
    }
    if(distance >= 10) {
        return '0.1'; // 10 ** - 1
    }
    return '0.01'; // 10 ** -2
}

/**
 * This does not provide the API associated with _BaseComponent
 * it is simpler to re-use for that reason.
 *
 * Will not include the range input if min and max are not numeric and finite
 */
export class PlainNumberAndRangeInput {
    //jshint ignore:start
    static TEMPLATE = `<div class="number_and_range_input">
    <label><!-- insert: label --></label>
    <input type='number'  size="3" /><!-- insert: unit -->
    <input type='range' />
</div>`;
    //jshint ignore:end
    /**
     * NOTE: how parentAPI can inject changeHandler! Maybe that's a better
     *      model in general. Under observation!
     */
    constructor(domTool, changeHandler, label, unit, minMaxValueStep) {
        this._domTool = domTool;
        this._passive = false;
        if(!minMaxValueStep)
            throw new Error(`VALUE ERROR can't build ${this.constructor.name} without minMaxValueStep`);
        this._minMaxValueStep = minMaxValueStep;
        [this.element, this._inputs, this._labelElement, this._unitElement
            , this._rangeElement
        ] = this._initTemplate();
        this.updateTemplateVars(label, unit, minMaxValueStep);
        this._changeHandler = (event)=>{
            event.preventDefault();
            changeHandler(parseFloat(event.target.value));
        };
        for(const elem of this._inputs)
            // is not yet removed ever anymore...
            elem.addEventListener('input', this._changeHandler);
    }

    _initTemplate() {
        const fragment = this._domTool.createFragmentFromHTML(this.constructor.TEMPLATE)
          , container = fragment.firstChild
          , labelElement = this._domTool.createElement('span', {})
          , unitElement =  this._domTool.createElement('span', {})
          ;
        this._domTool.insertAtMarkerComment(container, 'insert: label', labelElement);
        this._domTool.insertAtMarkerComment(container, 'insert: unit', unitElement);


        const rangeInput = fragment.querySelector('input[type="range"]');
        for(const label of container.querySelectorAll('label')) {
            label.addEventListener('click', ()=>rangeInput.focus());
        }
        const inputs = Array.from(container.getElementsByTagName('input'));
        return [container, inputs, labelElement, unitElement, rangeInput];
    }

    updateTemplateVars(label, unit, minMaxValueStep) {
        if(this._rangeElement) {
            const useRange = typeof minMaxValueStep.min === 'number' && isFinite(minMaxValueStep.min)
                     && typeof minMaxValueStep.max === 'number' && isFinite(minMaxValueStep.max);
            this._rangeElement.style.setProperty('display', useRange ? '' : 'none');
        }
        const minMaxValueStep_ = (!('step' in minMaxValueStep)
                                 && 'min' in minMaxValueStep
                                 && 'max' in minMaxValueStep)
                            ? Object.assign({step: _getInputStepsSizeForMinMax(minMaxValueStep.min, minMaxValueStep.max)}, minMaxValueStep)
                            : minMaxValueStep
          ;
        for(const [k,v] of Object.entries(minMaxValueStep_)) {
            // all of min, max, step, value work as properties
            for(const elem of this._inputs)
                elem[k] = v;
        }

        this._labelElement.textContent = `${label}`;
        if(unit) {
            this._domTool.clear(this._unitElement);
            // No-breaking-space \xA0 as a separator before the actual unit.
            // FIXME: Should rather be done with CSS by putting the unit
            // into a span container, seems like the Nbsp doesn't prevent
            // the line from breaking anyways!
            const nbsp = '\xA0';
            this._unitElement.append(`${nbsp}${unit}`);
        }
        else
            this._unitElement.textContent = '';
    }

    update(value) {
        // Clamp/clip/cutoff displayed value to min/max limits as configured.
        const min = 'min' in this._minMaxValueStep ? this._minMaxValueStep.min : value
            , max = 'max' in this._minMaxValueStep ? this._minMaxValueStep.max : value
            , limited = Math.min(max, Math.max(min, value))
            ;
        for(let input of this._inputs) {
            if(this._domTool.document.activeElement === input)
                // has focus
                continue;
            // synchronize the other element(s)
            input.value = limited;
        }
    }

    // use e.g. by UIManualAxesLocations
    set passive(val) {
         this._passive = !!val;
         this._inputs.map(input=>input.disabled = !!val);
    }

    get passive() {
        return this._passive;
    }

    setDisplay(show) {
        if(show)
            this.element.style.removeProperty('display');
        else
            this.element.style.display = 'none';
    }
}


export class PlainLineOfTextInput {
    //jshint ignore:start
    static TEMPLATE = `<div class="line_of_text">
    <label><!-- insert: label -->
    <input type='text'/></label>
</div>`;
    //jshint ignore:end
    constructor(domTool, changeHandler, label) {
        this._domTool = domTool;
        this._passive = false;
        [this.element, this._input] = this._initTemplate(label);

        this._changeHandler = (event)=>{
            event.preventDefault();
            changeHandler(event.target.value);
        };

        this._input.addEventListener('input', this._changeHandler);
    }

    _initTemplate(label) {
        const container = this._domTool.createFragmentFromHTML(this.constructor.TEMPLATE).firstElementChild
          , input = container.querySelector('input')
          ;
        this._domTool.insertAtMarkerComment(container, 'insert: label', label);
        return [container, input];
    }

    update(value) {
        this._input.value = value;
    }

    set passive(val) {
        this._passive = !!val;
        this._input.disabled = this._passive;
    }

    get passive() {
        return this._passive;
    }

    setDisplay(show) {
        if(show)
            this.element.style.removeProperty('display');
        else
            this.element.style.display = 'none';
    }
}

export class _AbstractOrEmptyPlainInputWrapper {
    static createClass(className, PlainInput) {
        // jshint unused: vars
        const result = {[className]: class extends this {
            // jshint ignore: start
            static PlainInput = PlainInput;
            // jshint ignore: end
        }};
        Object.freeze(result[className]);
        return result[className];
    }
    constructor(domTool, valueChangeHandler, toggleChangeHandler, ...wrappedArgs) {
        this._domTool = domTool;

        this._uiInput = new this.constructor.PlainInput(this._domTool, valueChangeHandler, ...wrappedArgs);
        this._uiToggle = new PlainToggleButton(this._domTool, toggleChangeHandler
                , 'toggle', 'set explicitly' , 'unset'
                , 'Toggle explicit number input or set empty.');
        this.element = this._uiInput.element;
        this.element.append(this._uiToggle.element);
    }
    update(active, value) {
        if(active) {
            this._uiInput.passive = false;
            this._uiInput.update(value);
            this._uiToggle.update(false);
            // toggle button: 'unset'
        }
        else {
            this._uiInput.passive = true;
            this._uiInput.update(value);
            this._uiToggle.update(true);
        }
    }

    setDisplay(show) {
        this._uiInput.setDisplay(show);
        this._uiToggle.setDisplay(show);
    }

    set passive(val) {
        this._uiInput.passive = val;
        this._uiToggle.passive = val;
    }

    get passive() {
        return this._uiInput.passive && this._uiToggle.passive;
    }

    destroy(){}
}

export class PlainToggleButton {
    // jshint ignore:start
    static baseClass = 'ui_toggle_button';
    // jshint ignore:end
    constructor(domTool, changeStateHandler, classToken, labelIsOn, labelIsOff, title) {
        this._domTool = domTool;
        this._labelIsOn = labelIsOn;
        this._labelIsOff = labelIsOff;
        this.element = this._domTool.createElement('button', {
                'class': `${this.constructor.baseClass} ${this.constructor.baseClass}-${classToken}`
              , title: title
            }, '(initializing)');

        this.element.addEventListener('click', (event)=>{
            event.preventDefault();
            changeStateHandler();
        });
    }
    update(booleanValue) {
        this._booleanValue = !!booleanValue;
        this.element.textContent = this._booleanValue
            ? this._labelIsOn
            : this._labelIsOff
            ;
    }
    setDisplay(show) {
        if(show)
            this.element.style.removeProperty('display');
        else
            this.element.style.display = 'none';
    }

    set passive(val) {
         this.element.disabled = !!val;
    }

    get passive() {
        return !!this.element.disabled;
    }
}

export class UIToggleButton extends _BaseComponent {
    // jshint ignore:start
    static baseClass = 'ui_toggle_button';
    // jshint ignore:end
    constructor(parentAPI, classToken, labelIsOn, labelIsOff, title) {
        super(parentAPI);
        const changeStateHandler = this._changeStateHandler(()=>{
            const entry = this.getEntry('boolean');
            entry.set(!entry.value);
        });

        this._ui = new PlainToggleButton(this._domTool, changeStateHandler
                                , classToken, labelIsOn, labelIsOff, title);
        this._insertElement(this._ui.element);
    }

    update(changedMap) {
        if(changedMap.has('boolean'))
            this._ui.update( changedMap.get('boolean').value);
    }
}

// can be anything, a label etc...
export class StaticTag extends _BaseComponent {
    constructor(parentAPI, tag, attr, contents) {
        super(parentAPI);
        this.element = this._domTool.createElement(tag, attr, contents);
        this._insertElement(this.element);
    }
}

export class StaticNode extends _BaseComponent {
    constructor(parentAPI, node) {
        super(parentAPI);
        this.node = node;
        this._insertElement(this.node);
    }
}

export class DynamicTag extends _BaseComponent {
    constructor(parentAPI, tag, attr, formatter) {
        super(parentAPI);
        this._formatter = formatter;
        this.element = this._domTool.createElement(tag, attr, `${this._formatter('(new)')}`);
        this._insertElement(this.element);
    }
    update(chageMap) {
        this.element.textContent = this._formatter(chageMap.get('data').value);
    }
}

/**
 * This is to swap each selected item with its neighbor in forward or
 * backward direction. It's not a list rotation, although that can be
 * achieved as well with this, it's however not the most intuitive.
 */
export class MoveItemsInListButton extends _BaseComponent {
    // jshint ignore:start
    static BACKWARD = Symbol('MOVE_ITEM_IN_LIST_BUTTON_BACKWARD');
    static FORWARD = Symbol('MOVE_ITEM_IN_LIST_BUTTON_FORWARD');
    static baseClass = 'ui_move_item_in_list_button';
    static setings = {
        [this.BACKWARD]: {
            title: 'Move item(s) one position backward.'
          , classToken: 'backward'
          , label: '⇇ move backward'
        }
      , [this.FORWARD]: {
           title: 'Move item(s) one position forward.'
         , classToken: 'forward'
         , label: 'move forward ⇉'
        }
    };
    // jshint ignore:end
    constructor(parentAPI, action, getKeysFn, setKeysFn) {
        super(parentAPI);
        const settings = this.constructor.setings[action];
        this._getKeysFn = getKeysFn;
        this._setKeysFn = setKeysFn;
        this.element = this._domTool.createElement('button', {
                'class': `${this.constructor.baseClass} ${this.constructor.baseClass}-${settings.classToken}`
              , title: settings.title
            }, settings.label);
        this.element.addEventListener('click', this._changeStateHandler((/*event*/)=>{
            const list = this.getEntry('list')
              , keysModel =  this.getEntry('keys')
              ;
            // Currently we don't show this widget if there's no
            // active KeyMoment, but the results of these checks
            // could also be used to change display properties in update ...
            if(list.size <= 1)
                // no elemet or one element: no move required
                return;
            if(keysModel.size === 0)
                // no element to act on
                return;

            const keys = this._getKeysFn(keysModel);
            if(action === this.constructor.FORWARD)
                // FIXME: WORKS but not when crossing the line...
                //        but that could also be because that changes the
                //        this._getKeysFn(keysModel) order a lot!
                keys.reverse();
            for(const key of keys) {
                if(action === this.constructor.FORWARD)
                    this._moveForward(keysModel, list, key);
                else if(action === this.constructor.BACKWARD)
                    this._moveBackward(keysModel, list, key);
                else
                    throw new Error(`TYPE ERROR action unkown ${action.toString()}.`);
            }
        }));
        this._insertElement(this.element);
    }

    _moveForward(keys, list, key) {
        const index = parseInt(key, 10);
        // [X, A, B, C, D] => [A, X, B, C, D] // X = 0 => .slice(0, 2, ...[A, X])
        // [A, X, B, C, D] => [A, B, X, C, D] // X = 0 => .slice(1, 2, ...[B, X])
        // [A, B, X, C, D] => [A, B, C, X, D] // X = 0 => .slice(2, 2, ...[C, X])
        // [A, B, C, X, D] => [A, B, C, D, X] // X = 0 => .slice(3, 2, ...[D, X])
        // FINALLY the circular order is complete again same as [X, A, B, C. D]
        // But here comes the overflow, same as second line [A, X, B, C, D]:
        // [A, B, C, D, X] => [X, B, C, D, A] // X = 0 => .slice(0, Infinity, ...[X, A, B, C, D])
        //                                                .push(.pop())
        if(index === list.size - 1) {
            const first = list.shift()
              , last = list.pop()
              ;
            list.push(first);
            list.unshift(last);
        }
        else
            // we checked already, list.size is > 1
            // also, index !== list.size - 1
            list.splice(index
                      , 2
                      , list.get(index + 1)
                      , list.get(index)
            );
        const newKey = (index === list.size - 1) ? '0': `${list.keyToIndex(index + 1)[0]}`;
        this._setKeysFn(keys, key, newKey);
    }

    _moveBackward(keys, list, key) {
        const index = parseInt(key, 10);
        // [A, B, C, D, X] => [A, B, C, X, D] // X = 0 => .slice(3, 2, ...[X, D])
        // [A, B, C, X, D] => [A, B, X, C, D] // X = 0 => .slice(2, 2, ...[X, C])
        // [A, B, X, C, D] => [A, X, B, C, D] // X = 0 => .slice(1, 2, ...[X, B])
        // [A, X, B, C, D] => [X, A, B, C, D] // X = 0 => .slice(0, 2, ...[X, A])
        // FINALLY:
        // [X, A, B, C, D] => [D, A, B, C, X] // X = 0 => .slice(0, Infinity, ...[A, B, C, D, X])
        if(index === 0) {
            const first = list.shift()
                , last = list.pop()
                ;
            list.push(first);
            list.unshift(last);
        }
        else
            list.splice(index - 1
                      , 2
                      , list.get(index)
                      , list.get(index - 1)
            );
        const newKey = `${list.keyToIndex(index - 1)[0]}`;
        this._setKeysFn(keys, key, newKey);
    }

    update(changedMap) {
        const list = changedMap.has('list')
                        ? changedMap.get('list')
                        : this.getEntry('list')
          , keysModel = changedMap.has('keys')
                        ? changedMap.get('keys')
                        : this.getEntry('keys')
          ;
        this.element.disabled = keysModel.size === 0 || list.size < 2;
    }
}

export class UINumberInput extends _BaseComponent {
    //jshint ignore:start
    static TEMPLATE = `<div class="number_input">
    <label><!-- insert: label -->
    <input type='number'/><!-- insert: unit --></label>
</div>`;
    //jshint ignore:end
    constructor(parentAPI, label, unit, minMax={}) {
        super(parentAPI);
        this._minMax = minMax;
        [this.element, this._input] = this._initTemplate(unit, minMax, label);

    }

    _initTemplate(unit, minMax, label) {
        const container = this._domTool.createFragmentFromHTML(this.constructor.TEMPLATE).firstElementChild
          , input = container.querySelector('input')
          ;

        input.addEventListener('input',  this._changeStateHandler((/*event*/)=>{
            this.getEntry('value').set(parseFloat(input.value));
        }));

        for(const [k, v] of Object.entries(minMax))
            input[k] = v;

        if(label)
            this._domTool.insertAtMarkerComment(container, 'insert: label', label);
        if(unit)
            this._domTool.insertAtMarkerComment(container, 'insert: unit', ` ${unit}`);
        this._insertElement(container);
        return [container, input];
    }

    update(changedMap) {
        if(changedMap.has('value')) {
            const value = changedMap.get('value').value
                // Clamp/clip/cutoff displayed value to min/max limits as configured.
              , min = 'min' in this._minMax ? this._minMax.min : value
              , max = 'max' in this._minMax ? this._minMax.max : value
              , limited = Math.min(max, Math.max(min, value))
              ;

            if(this._domTool.document.activeElement !== this._input)
                    // else: has focus
                this._input.value = limited;
        }
    }
}

class _UIAbstractPlainInputWrapper extends _BaseComponent {
    static createClass(className, PlainInput) {
        // jshint unused: vars
        const result = {[className]: class extends this {
            // jshint ignore: start
            static PlainInput = PlainInput;
            // jshint ignore: end
        }};
        Object.freeze(result[className]);
        return result[className];
    }
    constructor(parentAPI, ...wrappedArgs) {
        super(parentAPI);
        const changeHandler = this._changeStateHandler(
            value=>this.getEntry('value').set(value));
        this._ui = new this.constructor.PlainInput(this._domTool, changeHandler, ...wrappedArgs);
        this._insertElement(this._ui.element);
    }

    update(changedMap) {
        if(changedMap.has('value'))
            this._ui.update(changedMap.get('value').value);
    }

    set passive(val) {
         this._ui.passive = !!val;
    }

    get passive() {
        return this._ui.passive;
    }

    setDisplay(show) {
        this._ui.setDisplay(show);
    }
}


// Maybe, this should be implemented using a _BaseContainerComponent
// It also needs a toggle, to set value to empty or to not empty
// and even when value is empty, we may want to animate value still.
// So, there's an extra switch ...
class _UIAbstractPlainOrEmptyInputWrapper extends _BaseComponent {
    static createClass(className, PlainOrEmptyInput) {
        // jshint unused: vars
        const result = {[className]: class extends this {
            // jshint ignore: start
            static PlainOrEmptyInput = PlainOrEmptyInput;
            // jshint ignore: end
        }};
        Object.freeze(result[className]);
        return result[className];
    }
    constructor(parentAPI, getDefault, requireUpdateDefaults, ...wrappedArgs /*e.g. label*/) {
        super(parentAPI);
        this._getDefault = getDefault || null;
        this._requireUpdateDefaults = requireUpdateDefaults || (()=>false);

         const valueChangeHandler = this._changeStateHandler(
                            value=>this.getEntry('value').set(value))
          , toggleChangeHandler = this._changeStateHandler(()=>{
                const valueOrEmpty = this.getEntry('value');
                if(valueOrEmpty.isEmpty)
                    valueOrEmpty.set(this._getDefault
                                ? this._getDefault()
                                : undefined
                    ); // toggle to explicit
                else
                    valueOrEmpty.clear(); // clear
            })
          ;

        this._ui = new this.constructor.PlainOrEmptyInput(this._domTool
                , valueChangeHandler
                , toggleChangeHandler
                , ...wrappedArgs);

        this._insertElement(this._ui.element);
    }

    update(changedMap) {
        const requireUpdateDefaults = this._requireUpdateDefaults(changedMap);
        if(changedMap.has('value') || requireUpdateDefaults) {
            const valueOrEmpty = changedMap.has('value')
                    ? changedMap.get('value')
                    : this.getEntry('value')
                    ;

            let active, value;
            if(!valueOrEmpty.isEmpty) {
                active = true;
                value = valueOrEmpty.value;
            }
            else {
                active = false;
                value = this._getDefault
                            ? this._getDefault()
                            : undefined
                            ;
            }
            this._ui.update(active, value);
        }
    }
}

export const
    /*** UI{ ??? }Input ***/
    /**
     * call with extra args: label
     */
    UILineOfTextInput = _UIAbstractPlainInputWrapper.createClass(
          'UILineOfTextInput'
        , PlainLineOfTextInput
    )
    /**
     * call with extra args: label, unit, minMaxValueStep
     */
  , UINumberAndRangeInput = _UIAbstractPlainInputWrapper.createClass(
        'UINumberAndRangeInput'
      , PlainNumberAndRangeInput
    )
  , UISelectInput = _UIAbstractPlainInputWrapper.createClass(
        'UISelectInput'
      , PlainSelectInput
    )
    /*** Plain{ ??? }OrEmpty ***/
  , PlainNumberAndRangeOrEmptyInput = _AbstractOrEmptyPlainInputWrapper.createClass(
        'PlainNumberAndRangeOrEmptyInput'
      , PlainNumberAndRangeInput
    )
  , PlainLineOfTextOrEmptyInput = _AbstractOrEmptyPlainInputWrapper.createClass(
        'PlainLineOfTextOrEmptyInput'
      , PlainLineOfTextInput
    )
  , PlainSelectOrEmptyInput = _AbstractOrEmptyPlainInputWrapper.createClass(
        'PlainSelectOrEmptyInput'
      , PlainSelectInput
    )
    /*** UI{ ??? }OrEmptyInput ***/
  , UILineOfTextOrEmptyInput = _UIAbstractPlainOrEmptyInputWrapper.createClass(
        'UILineOfTextOrEmptyInput'
      , PlainLineOfTextOrEmptyInput
    )
  , UINumberAndRangeOrEmptyInput = _UIAbstractPlainOrEmptyInputWrapper.createClass(
        'UINumberAndRangeOrEmptyInput'
      , PlainNumberAndRangeOrEmptyInput
    )
  , UISelectOrEmptyInput = _UIAbstractPlainOrEmptyInputWrapper.createClass(
        'UISelectOrEmptyInput'
      , PlainSelectOrEmptyInput
    )
  ;
