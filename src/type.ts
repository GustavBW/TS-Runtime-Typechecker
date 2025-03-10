import { joinOmitSeperatorOnLast } from './arrayUtil';
import { stringifyAllButKeys } from './jsonUtil';
import { __rtcInternalSupportiveField, MetaType, Type, type AbstractValidator, type FieldValidatorFunction, type TypeDeclaration } from './superMetaTypes';
import type { Error } from './supporting';

export const isValidFloat = (arg: any): boolean => {
    return isValidNumber(Number.parseFloat(arg));
};

export const isValidInteger = (arg: any): boolean => {
    const num = Number(arg);
    return isValidNumber(num) && Number.isInteger(num);
};

export const isValidNumber = (arg: number): boolean => {
    return !Number.isNaN(arg) && Number.isFinite(arg);
};

/**
 * Complete runtime type checking for objects
 * @since 0.0.1
 * @author GustavBW
 */
export const conformsToType = <T>(object: T, topLevelValidator: TypeDeclaration | FieldValidatorFunction | Type): Error | undefined => {
    if (typeof topLevelValidator === 'string') {
        // If the type declaration is a string, check the object's type.
        if (!validateSimpleType(topLevelValidator, object)) {
            return `Object is expected to be of type "${topLevelValidator}", observed value: ${JSON.stringify(object)}`;
        }
        return undefined;
    }

    if (typeof topLevelValidator === 'function') {
        // If the type declaration is a function, use it to validate the object.
        if (!topLevelValidator(object)) {
            return `Object does not conform to the expected "${topLevelValidator.typeString}", observed value: ${JSON.stringify(object)}`;
        }
        return undefined;
    }

    //If not function nor simple type, then it has to be a TypeDeclaration

    if (object === null || object === undefined) {
        return 'Object is expected to exist';
    }

    //Structural constraint check
    if (topLevelValidator[__rtcInternalSupportiveField]) {
        for (const constraint of topLevelValidator[__rtcInternalSupportiveField].structuralConstraints) {
            const error = constraint(object, topLevelValidator);
            if (error) {
                return 'Structural issue:\n\t' + error;
            }
        }
    }

    //And now for the actual check of field values
    for (const key of Object.keys(topLevelValidator)) {
        if (key === __rtcInternalSupportiveField) {
            continue;
        }

        const validator = topLevelValidator[key];
        const value = object[key as keyof T];

        const error = executeValidatorForValue(value, key, validator);
        if (error) {
            return error;
        }
    }
    return undefined; // All fields conform to the expected types.
};

export const executeValidatorForValue = (value: any, key: any, validator: AbstractValidator): Error | undefined => {
    if (!validator || validator === null) {
        return "Internal error, validator is null or undefined";
    }

    if (key === __rtcInternalSupportiveField) {
        return undefined;
    }
    
    if (typeof validator === 'object') {
        // TypeDeclaration contains a TypeDeclaration
        const nestedError = conformsToType(value, validator as TypeDeclaration);
        if (nestedError) {
            return `Field ${key} failed nested type check:\n\t${nestedError}`;
        }
    } else if (typeof validator === 'function') {
        // If the type declaration is a function, use it to validate the field.
        const res = validator(value);
        if (!res) {
            return `Field ${key} does not conform to the expected "${validator.typeString}", observed value: ${JSON.stringify(value)}`;
        }
    } else if (typeof validator === 'string') {
        // If the type declaration is a Type enum, check the value's type.
        const res = validateSimpleType(validator, value);
        if (!res) {
            return `Field ${key} is expected to exist and be of type "${validator}" but had value: ${JSON.stringify(value)}`;
        }
    }
};

export const validateSimpleType = (expectedType: Type, value: any): boolean => {
    switch (expectedType) {
        case Type.STRING:
            return typeof value === 'string';
        case Type.FLOAT:
            return typeof value === 'number' && isValidFloat(value);
        case Type.INTEGER:
            return typeof value === 'number' && isValidInteger(value);
        case Type.BOOLEAN:
            return typeof value === 'boolean';
        case Type.OBJECT:
            return typeof value === 'object' && !Array.isArray(value) && value !== null;
        case Type.ARRAY:
            return Array.isArray(value);
        case null:
            return value === null;
        case undefined:
            return value === undefined;
        default:
            return false;
    }
};
const validateOptionalType = (value: any, validator: AbstractValidator): boolean => {
    if (value === undefined) {
        return true; // Accept undefined
    }
    if (typeof validator === 'function') {
        return validator(value);
    } else if (typeof validator === 'object') {
        return conformsToType(value, validator as TypeDeclaration) === undefined;
    }
    return validateSimpleType(validator, value);
};
/**
 * Same as T | undefined
 * @since 0.0.1
 * @author GustavBW
 */
const optionalType = (validator: AbstractValidator): FieldValidatorFunction => {
    const wrappedValidator = (value: any) => validateOptionalType(value, validator);
    wrappedValidator.metaType = MetaType.OPTIONAL;

    if (typeof validator === 'string') {
        wrappedValidator.typeString = '(' + validator + ')?';
    } else if (typeof validator === 'object') {
        wrappedValidator.typeString = stringifyAllButKeys(validator, [__rtcInternalSupportiveField]) + '?';
    } else if (typeof validator === 'function') {
        wrappedValidator.typeString = '(' + validator.typeString + ')?';
    }

    return wrappedValidator;
};
const validateTypeUnionOR = (value: any, validators: AbstractValidator[]): boolean => {
    for (const validator of validators) {
        if (typeof validator === 'function') {
            if (validator(value)) {
                return true;
            }
        } else if (typeof validator === 'object') {
            if (conformsToType(value, validator as TypeDeclaration) === undefined) {
                return true;
            }
        } else if (validateSimpleType(validator, value)) {
            return true;
        }
    }
    return false;
};
const typeUnionOR = (...validators: AbstractValidator[]): FieldValidatorFunction => {
    const wrappedValidator = (value: any) => validateTypeUnionOR(value, validators);
    wrappedValidator.typeString = joinOmitSeperatorOnLast(
        validators.map((validator) => {
            if (typeof validator === 'string') {
                return validator;
            } else if (typeof validator === 'object') {
                return stringifyAllButKeys(validator, [__rtcInternalSupportiveField]);
            } else {
                return validator.typeString;
            }
        }),
        ' | ',
    );
    wrappedValidator.metaType = MetaType.EXCLUSIVE_UNION;
    return wrappedValidator;
};
const validatorTypedTuple = (value: any, validators: AbstractValidator[]): boolean => {
    if (!Array.isArray(value) || value.length !== validators.length) {
        return false;
    }
    for (let i = 0; i < validators.length; i++) {
        const validator = validators[i];
        if (typeof validator === 'function') {
            if (!validator(value[i])) {
                return false;
            }
        } else if (typeof validator === 'object') {
            if (conformsToType(value[i], validator as TypeDeclaration) !== undefined) {
                return false;
            }
        } else if (!validateSimpleType(validator, value[i])) {
            return false;
        }
    }
    return true;
};
const typedTuple = (validators: AbstractValidator[]): FieldValidatorFunction => {
    const wrappedValidator = (value: any) => validatorTypedTuple(value, validators);
    wrappedValidator.typeString =
        '[' +
        joinOmitSeperatorOnLast(
            validators.map((validator) => {
                if (typeof validator === 'string') {
                    return validator;
                } else if (typeof validator === 'object') {
                    return stringifyAllButKeys(validator, [__rtcInternalSupportiveField]);
                } else {
                    return validator.typeString;
                }
            }),
            ', ',
        ) +
        ']';
    wrappedValidator.metaType = MetaType.TUPLE;
    return wrappedValidator;
};
const validateTypedArray = (value: any, howToInvokeValidator: (v: any) => boolean): boolean => {
    if (!Array.isArray(value)) {
        return false;
    }
    for (const element of value) {
        if (!howToInvokeValidator(element)) {
            return false;
        }
    }
    return true;
};
const typedArray = (validator: AbstractValidator): FieldValidatorFunction => {
    let howToInvokeValidator: (v: any) => boolean;
    if (typeof validator === 'function') {
        howToInvokeValidator = (v: any) => validator(v);
    } else if (typeof validator === 'object') {
        howToInvokeValidator = (v: any) => conformsToType(v, validator as TypeDeclaration) === undefined;
    } else {
        howToInvokeValidator = (v: any) => validateSimpleType(validator, v);
    }
    const wrappedValidator = (value: any) => validateTypedArray(value, howToInvokeValidator);

    if (typeof validator === 'string') {
        wrappedValidator.typeString = validator + '[]';
    } else if (typeof validator === 'object') {
        wrappedValidator.typeString = stringifyAllButKeys(validator, [__rtcInternalSupportiveField]) + '[]';
    } else if (typeof validator === 'function') {
        wrappedValidator.typeString = '(' + validator.typeString + ')[]';
    }
    wrappedValidator.metaType = MetaType.LIST;
    return wrappedValidator;
};

const anyOfConstants = (constants: (string | number)[]): FieldValidatorFunction => {
    //Avoiding mutation of the original array (which for some reason happens)
    const arrCopy = [...constants];
    const wrappedValidator = (value: any) => {
        return arrCopy.includes(value);
    };
    wrappedValidator.typeString = joinOmitSeperatorOnLast(constants, ' | ');
    wrappedValidator.metaType = MetaType.EXCLUSIVE_UNION;
    return wrappedValidator;
};

export const Field = {
    anyOfConstants,
    optional: optionalType,
    unionOR: typeUnionOR,
    tuple: typedTuple,
    array: typedArray,
    /** Validate single, simple value */
    simple: validateSimpleType,
};
export default Field;
