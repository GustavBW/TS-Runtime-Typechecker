import { test, expect, describe } from 'bun:test';
import { Field, conformsToType } from './type';
import { Type, type TypeDeclaration } from './superMetaTypes';

describe('validateType Tests', () => {
    test('validateType should return true on valid string input', async () => {
        expect(Field.simple(Type.STRING, 'string')).toBe(true);
    });
    test('validateType should return false on invalid string input', async () => {
        expect(Field.simple(Type.STRING, 1)).toBe(false);
    });
    test('validateType should return true on valid float input', async () => {
        expect(Field.simple(Type.FLOAT, 1.0)).toBe(true);
    });
    test('validateType should return false on invalid float input', async () => {
        expect(Field.simple(Type.FLOAT, 'string')).toBe(false);
    });
    test('validateType should return true on valid integer input', async () => {
        expect(Field.simple(Type.INTEGER, 1)).toBe(true);
    });
    test('validateType should return false on invalid integer input', async () => {
        expect(Field.simple(Type.INTEGER, 1.1)).toBe(false);
    });
    test('validateType should return true on valid boolean input', async () => {
        expect(Field.simple(Type.BOOLEAN, true)).toBe(true);
    });
    test('validateType should return false on invalid boolean input', async () => {
        expect(Field.simple(Type.BOOLEAN, 1)).toBe(false);
    });
    test('validateType should return true on valid object input', async () => {
        expect(Field.simple(Type.OBJECT, {})).toBe(true);
    });
    test('validateType should return false on invalid object input', async () => {
        expect(Field.simple(Type.OBJECT, 1)).toBe(false);
    });
    test('validateType should return true on valid array input', async () => {
        expect(Field.simple(Type.ARRAY, [])).toBe(true);
    });
    test('validateType should return false on invalid array input', async () => {
        expect(Field.simple(Type.ARRAY, {})).toBe(false);
    });
});

describe('optionalType Tests', () => {
    test('optionalType should generate a validator function that returns true on undefined and correct type', async () => {
        const validator = Field.optional(Type.STRING);
        expect(validator).toBeInstanceOf(Function);
        expect(validator(undefined)).toBe(true);

        expect(validator(null)).toBe(false);

        expect(validator('string')).toBe(true);
        expect(validator('')).toBe(true);
    });
    test('optionalType should generate a validator function that returns false on incorrect type', async () => {
        const validator = Field.optional(Type.STRING);
        expect(validator(1)).toBe(false);
        expect(validator(true)).toBe(false);
        expect(validator({})).toBe(false);
        expect(validator([])).toBe(false);
    });
    test('optionalType should generate a validator function that returns true on undefined and correct type, object', async () => {
        const validator = Field.optional(Type.OBJECT);
        expect(validator).toBeInstanceOf(Function);
        expect(validator(undefined)).toBe(true);

        expect(validator(null)).toBe(false);

        expect(validator({})).toBe(true);
        expect(validator([])).toBe(false);
    });
    test('optionalType should generate a validator function that returns true on undefined and correct type, array', async () => {
        const validator = Field.optional(Type.ARRAY);
        expect(validator).toBeInstanceOf(Function);
        expect(validator(undefined)).toBe(true);

        expect(validator(null)).toBe(false);

        expect(validator([])).toBe(true);
        expect(validator({})).toBe(false);
    });

    test('optionalType should work with constant ranges', async () => {
        const validator = Field.optional(Field.anyOfConstants(['a', 'b']));
        expect(validator).toBeInstanceOf(Function);
        // Must fail
        expect(validator(null)).toBe(false);
        expect(validator(1)).toBe(false);
        expect(validator(1.1)).toBe(false);
        expect(validator(true)).toBe(false);
        expect(validator({})).toBe(false);
        expect(validator([])).toBe(false);
        // Should succeed
        expect(validator(undefined)).toBe(true);
        expect(validator('a')).toBe(true);
        expect(validator('b')).toBe(true);
    });
});

describe('typeUnionOR Tests', () => {
    test('typeUnionOR should generate a validator function that returns true on any of the provided validators, string', async () => {
        const validator = Field.unionOR(Type.STRING);
        expect(validator).toBeInstanceOf(Function);
        expect(validator(undefined)).toBe(false);
        expect(validator(null)).toBe(false);
        expect(validator({})).toBe(false);
        expect(validator([])).toBe(false);
        expect(validator(true)).toBe(false);

        expect(validator('string')).toBe(true);
        expect(validator('')).toBe(true);
    });
    test('typeUnionOR should generate a validator function that returns true on any of the provided validators, string or integer', async () => {
        const validator = Field.unionOR(Type.STRING, Type.INTEGER);
        expect(validator).toBeInstanceOf(Function);
        expect(validator(undefined)).toBe(false);
        expect(validator(null)).toBe(false);
        expect(validator(0.1)).toBe(false);
        expect(validator({})).toBe(false);
        expect(validator([])).toBe(false);
        expect(validator(true)).toBe(false);

        expect(validator('string')).toBe(true);
        expect(validator('')).toBe(true);
        expect(validator(1)).toBe(true);
        expect(validator(0)).toBe(true);
    });
    test('typeUnionOR should work with optionalType, when written sensibly', async () => {
        const validator = Field.optional(Field.unionOR(Type.STRING, Type.INTEGER));
        expect(validator).toBeInstanceOf(Function);
        expect(validator(0.1)).toBe(false);
        expect(validator({})).toBe(false);
        expect(validator([])).toBe(false);
        expect(validator(true)).toBe(false);

        expect(validator(undefined)).toBe(true);

        expect(validator(null)).toBe(false);
        expect(validator('string')).toBe(true);
        expect(validator('')).toBe(true);
        expect(validator(1)).toBe(true);
        expect(validator(0)).toBe(true);
    });
});

describe('conformsToType Tests', () => {
    test('conformsToType should return null on valid input', async () => {
        const typeDeclaration = {
            source: Type.STRING,
            width: Field.optional(Type.INTEGER),
            height: Field.optional(Type.INTEGER),
        };
        const object = {
            source: 'https://http.cat/images/100.jpg',
            width: 100,
            height: 100,
        };
        expect(conformsToType(object, typeDeclaration)).toBeUndefined();
    });
    test('conformsToType should return error on invalid input', async () => {
        const typeDeclaration = {
            source: Type.STRING,
            width: Field.optional(Type.INTEGER),
            height: Field.optional(Type.INTEGER),
        };
        const object = {
            source: 'https://http.cat/images/100.jpg',
            width: 100,
            height: '100',
        };
        const typeErr = conformsToType(object, typeDeclaration);
        expect(typeErr).not.toBeNull();
        expect(typeErr).not.toBeUndefined();
    });
    test('conformsToType should return error on missing required field', async () => {
        const typeDeclaration = {
            source: Type.STRING,
            width: Field.optional(Type.INTEGER),
            height: Field.optional(Type.INTEGER),
        };
        const object = {
            width: 100,
            height: 100,
        };
        const typeErr = conformsToType(object, typeDeclaration);
        expect(typeErr).not.toBeNull();
        expect(typeErr).not.toBeUndefined();
    });
    test('conformsToType should work with type unions', async () => {
        const typeDeclaration = {
            field: Type.STRING,
            field2: Field.unionOR(Type.INTEGER, Type.STRING),
        };
        const objectA = {
            field: 'some',
            field2: 'string',
        };
        const objectB = {
            field: 'some',
            field2: 1,
        };
        const typeErrA = conformsToType(objectA, typeDeclaration);
        expect(typeErrA).toBeUndefined();

        const typeErrB = conformsToType(objectB, typeDeclaration);
        expect(typeErrB).toBeUndefined();
    });
    test('conformsToType should work with an optional type union', async () => {
        const typeDeclaration = {
            field: Type.STRING,
            field2: Field.optional(Field.unionOR(Type.INTEGER, Type.STRING)),
        };
        const objectA = {
            field: 'some',
            field2: 'string',
        };
        const objectB = {
            field: 'some',
            field2: 1,
        };
        const objectC = {
            field: 'some',
        };
        const typeErrA = conformsToType(objectA, typeDeclaration);
        expect(typeErrA).toBeUndefined();
        const typeErrB = conformsToType(objectB, typeDeclaration);
        expect(typeErrB).toBeUndefined();
        const typeErrC = conformsToType(objectC, typeDeclaration);
        expect(typeErrC).toBeUndefined();
    });
    test('conformsToType should work with nested TypeDeclarations', async () => {
        const typeDeclaration: TypeDeclaration = {
            field: Type.STRING,
            nested: {
                field: Type.INTEGER,
                field2: Type.STRING,
            },
        };
        const validObject = {
            field: 'some',
            nested: {
                field: 1,
                field2: 'string',
            },
        };
        const invalidObject = {
            field: 'some',
            nested: {
                field: 'string',
                field2: 'string',
            },
        };
        const typeErr = conformsToType(validObject, typeDeclaration);
        expect(typeErr).toBeUndefined();
        const typeErr2 = conformsToType(invalidObject, typeDeclaration);
        expect(typeErr2).not.toBeNull();
        expect(typeErr2).not.toBeUndefined();
        expect(typeof typeErr2).toBe('string');
    });

    test('conformsToType should work with nested TypeDeclarations and optional fields', async () => {
        const typeDeclaration: TypeDeclaration = {
            field: Type.STRING,
            nested: {
                field: Type.INTEGER,
                field2: Field.optional(Type.STRING),
            },
        };
        const objectA = {
            field: 'some',
            nested: {
                field: 1,
            },
        };
        const objectB = {
            field: 'some',
            nested: {
                field: 1,
                field2: 'string',
            },
        };
        const typeErr = conformsToType(objectA, typeDeclaration);
        expect(typeErr).toBeUndefined();
        const typeErrB = conformsToType(objectB, typeDeclaration);
        expect(typeErrB).toBeUndefined();
    });

    test('conformsToType should work with nested optional TypeDeclarations', async () => {
        const typeDeclaration: TypeDeclaration = {
            field: Type.STRING,
            nested: Field.optional({
                field: Type.INTEGER,
                field2: Type.STRING,
            }),
        };
        const objectA = {
            field: 'some',
        };
        const objectB = {
            field: 'some',
            nested: {
                field: 1,
                field2: 'string',
            },
        };
        const typeErr = conformsToType(objectA, typeDeclaration);
        expect(typeErr).toBeUndefined();
        const typeErrB = conformsToType(objectB, typeDeclaration);
        expect(typeErrB).toBeUndefined();
    });
    test('conformsToType should work with nested TypeDeclaration unions', async () => {
        const typeDeclaration: TypeDeclaration = {
            field1: Type.STRING,
            field2: Field.unionOR(
                {
                    field3: Type.INTEGER,
                    field4: Type.STRING,
                },
                {
                    field3: Type.STRING,
                    field4: Type.INTEGER,
                },
            ),
        };
        const objectA = {
            field1: 'some',
            field2: {
                field3: 1,
                field4: 'string',
            },
        };
        const objectB = {
            field1: 'some',
            field2: {
                field3: 'string',
                field4: 1,
            },
        };
        const someInvalidObject = {
            field1: 'some',
            field2: {
                field3: 'string',
                field4: 'string',
            },
        };
        const typeErr = conformsToType(objectA, typeDeclaration);
        expect(typeErr).toBeUndefined();

        const typeErrB = conformsToType(objectB, typeDeclaration);
        expect(typeErrB).toBeUndefined();

        const typeErrC = conformsToType(someInvalidObject, typeDeclaration);
        expect(typeErrC).not.toBeUndefined();
        expect(typeErrC).not.toBeNull();
        expect(typeof typeErrC).toBe('string');
    });
});

describe('typedTuple Tests', () => {
    test('typedTuple should correctly accept valid input', async () => {
        const testData = [10, 10];
        const testDECL = Field.tuple([Type.INTEGER, Type.INTEGER]);

        const error = conformsToType(testData, testDECL);
        expect(error).toBeUndefined();
    });

    test('typedTuple should correctly reject invalid input', async () => {
        const testData = [
            [10, '10'],
            [10, undefined],
            [10, null],
            [10, true],
            [0, false],
        ];
        const testDECL = Field.array(Field.tuple([Type.INTEGER, Type.INTEGER]));

        const error = conformsToType(testData, testDECL);
        expect(error).not.toBeUndefined();
    });
});

describe('typedArray Tests', () => {
    test('typedArray should correctly accept valid input', async () => {
        const testData = [10, 10, 1, Number.MAX_SAFE_INTEGER, Number.MIN_SAFE_INTEGER, 0];
        const testDECL = Field.array(Type.INTEGER);

        const error = conformsToType(testData, testDECL);
        expect(error).toBeUndefined();
    });
    test('typedArray should correctly reject invalid input', async () => {
        const testData = ['10', undefined, null, true, false];
        const testDECL = Field.array(Type.INTEGER);

        const error = conformsToType(testData, testDECL);
        expect(error).not.toBeNull();
    });
    test('typedArray compound test, successfull', async () => {
        const testData = [
            [10, 10],
            [10, 10],
            [10, 10],
            [10, 10],
            [10, 10],
        ];
        const testDECL = Field.array(Field.tuple([Type.INTEGER, Type.INTEGER]));

        const error = conformsToType(testData, testDECL);
        expect(error).toBeUndefined();
    });
    test('typedArray compound test, unsuccessfull', async () => {
        const testData = [
            [10, 10],
            [10, '10'],
            [10, undefined],
            [10, null],
            [10, true],
            [0, false],
        ];
        const testDECL = Field.array(Field.tuple([Type.INTEGER, Type.INTEGER]));

        const error = conformsToType(testData, testDECL);
        expect(error).not.toBeNull();
    });
});

describe('compound Tests', () => {
    test('compound typedArray, typedTuple test, successfull', async () => {
        const testData = [
            [
                [10, 10],
                [10, 10],
                [10, 10],
                [10, 10],
                [10, 10],
            ],
        ];
        const testDECL = Field.array(Field.tuple([Type.INTEGER, Type.INTEGER]));

        const error = conformsToType(testData, Field.array(testDECL));
        expect(error).toBeUndefined();
    });
    test('compound typedArray, typedTuple test, unsuccessfull', async () => {
        const testData = [
            [
                [10, 10],
                [10, '10'],
                [10, undefined],
                [10, null],
                [10, true],
                [0, false],
            ],
        ];
        const testDECL = Field.array(Field.tuple([Type.INTEGER, Type.INTEGER]));

        const error = conformsToType(testData, Field.array(testDECL));
        expect(error).not.toBeUndefined();
    });
    test('compound optionalType, typedArray, typedTuple test, successfull', async () => {
        const testData = [
            [10, 10],
            [10, 10],
            [10, 10],
            [10, 10],
            [10, 10],
        ];
        const testDECL = Field.optional(Field.array(Field.tuple([Type.INTEGER, Type.INTEGER])));

        const error = conformsToType(testData, testDECL);
        expect(error).toBeUndefined();

        const error2 = conformsToType(undefined, testDECL);
        expect(error2).toBeUndefined();
    });
    test('compound optionalType, typedArray, typedTuple test, unsuccessfull', async () => {
        const testData = [
            [
                [10, 10],
                [10, '10'],
                [10, undefined],
                [10, null],
                [10, true],
                [0, false],
            ],
        ];
        const testDECL = Field.optional(Field.array(Field.tuple([Type.INTEGER, Type.INTEGER])));

        const error = conformsToType(testData, testDECL);
        expect(error).not.toBeNull();

        const error2 = conformsToType(null, testDECL);
        expect(error2).not.toBeNull();
    });
    test('compound optionalType, typedArray, typedTuple test, successfull 2', async () => {
        const testData = [[10, 10], undefined, [0, 0]];
        const testDECL = Field.array(Field.optional(Field.tuple([Type.INTEGER, Type.INTEGER])));

        const error = conformsToType(testData, testDECL);
        expect(error).toBeUndefined();
    });
});
