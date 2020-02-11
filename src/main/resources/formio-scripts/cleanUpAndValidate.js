'use strict';

function _interopDefault(ex) { return (ex && (typeof ex === 'object') && 'default' in ex) ? ex['default'] : ex; }


var jsdomGlobal = _interopDefault(require('jsdom-global'));
var commonjsGlobal = typeof globalThis !== 'undefined' ? globalThis : typeof window !== 'undefined' ? window : typeof global !== 'undefined' ? global : typeof self !== 'undefined' ? self : {};
var fs = _interopDefault(require('fs'));
var path = _interopDefault(require('path'));
jsdomGlobal();
commonjsGlobal.Option = commonjsGlobal.window.Option;

var formiojs = _interopDefault(require('formiojs'));


function commonjsRequire() {
    throw new Error('Dynamic requires are not currently supported by @rollup/plugin-commonjs');
}

var takeFromStdin = function takeFromStdin() {
    const [form, submission, pathToCustomComponentsFolder] = ["%1$s", "%2$s", '%3$s'];
    return [JSON.parse(form), JSON.parse(submission), pathToCustomComponentsFolder];
};

const { Formio } = formiojs;




function registerComponent(componentDetails = {}) {
    const { name, path } = componentDetails;
    const customComponent = require(path);
    Formio.registerComponent(name, customComponent);
}

var registerCustomComponents = function registerCustomComponents() {
    const [, , pathToCustomComponentsFolder] = takeFromStdin();

    if (!pathToCustomComponentsFolder) return;

    const files = fs.readdirSync(pathToCustomComponentsFolder);
    const componentsDetails = files
        .filter(paths => path.extname(paths) === '.js')
        .map(fileBasename => {
            const name = fileBasename.slice(0, -path.extname(fileBasename).length);
            return {
                name,
                path: path.resolve(pathToCustomComponentsFolder, fileBasename)
            }
        });

    componentsDetails.forEach(registerComponent);
};

const { Formio: Formio$1 } = formiojs;

registerCustomComponents();
const body = document.body;

var validateSubmission = function validateSubmission(form, submission) {
    return new Promise((resolve, reject) => {
        Formio$1.createForm(body, form)
            .then(instance => {
                instance.once('error', error => {
                    reject(error);
                });
                instance.once('submit', submit => {
                    resolve(submit);
                });
                instance.once('change', () => {
                    instance.submit()
                        .then(() => {

                        }).catch(() => {

                        });
                });
                instance.submission = submission;
            })
            .catch(err => {
                reject(err);
            });
    })
};

const arrayComponents = ['datagrid'];


function saveToResult(key, result) {
    if (Array.isArray(result)) {
        result.push({ [key]: true });
    } else if (typeof result === 'object') {
        result[key] = true;
    }
}

function extendResult(componentType, key, result) {
    if (arrayComponents.includes(componentType)) {
        result[key] = [{}];
        return result[key][0]
    }
    result[key] = {};
    return result[key];
}

function makeSchema(component, result) {
    if (Array.isArray(component)) {
        component.forEach(subComponent => makeSchema(subComponent, result));
    } else if (component !== null && typeof component === 'object') {
        if (component.tree && Array.isArray(component.components)) {
            const link = extendResult(component.type, component.key, result);
            if (Array.isArray(link)) {
                link.push({});
                component.components.forEach((component, i) => {
                    makeSchema(component, link[0]);
                });
            } else {
                component.components.forEach(component => makeSchema(component, link));
            }
        } else if (component.input) {
            saveToResult(component.key, result);
        } else {
            for (let key in component) {
                if (typeof component[key] === 'object') {
                    makeSchema(component[key], result);
                }
            }
        }
    }
}

function ArrayHasArray(parentArray, childArray) {
    return childArray.every(element => parentArray.includes(element));
}

function clearArrayOfPrimitiveTypes(array) {
    const filteredArray = array.filter(element => typeof element === 'object' && element !== null);
    array.splice(0, array.length, ...filteredArray);
}

function removeUnmatchedObjects(array, schema) {
    const filteredArray = array.filter(element => {
        const keys = Object.keys(element);
        return schema.some(el => ArrayHasArray(Object.keys(el), keys));
    });
    filteredArray.forEach((element, i) => {
        if (typeof element === "object") {
            stripUnknown(element, schema[i]);
        }
    });
    array.splice(0, array.length, ...filteredArray);
}

function stripUnknown(data, schema) {
    if (typeof data !== 'object' || data === null || typeof schema !== 'object' || schema === null) return;
    if (Array.isArray(data)) {
        if (!Array.isArray(schema)) {
            data.splice(0, data.length);
        }
        clearArrayOfPrimitiveTypes(data);
        removeUnmatchedObjects(data, schema);
    } else {
        for (let key in data) {
            if (!(key in schema)) {
                delete data[key];
            }
            if (schema[key] !== null && typeof schema[key] === 'object') {
                if (typeof data[key] !== 'object' || data[key] === null) {
                    delete data[key];
                } else {
                    stripUnknown(data[key], schema[key]);
                }
            }
        }
    }
}

var cleanUpSubmission = function cleanUpSubmissionData(form, submission = {}) {
    const data = submission.data;
    const result = {};
    makeSchema(form, result);
    stripUnknown(data, result);
    return { ...submission, data: data };
};

var putToStdout = function putToStdout(fn, ...args) {
    fn(...args)
        .then(result => {
            try {
                result = JSON.stringify(result);
                console.info(result);
            } catch (err) {
                console.error(err);
            }
        })
        .catch(err => {
            console.error(err);
        });
};

let [form, submission] = takeFromStdin();
submission = cleanUpSubmission(form, submission);
putToStdout(validateSubmission, form, submission);
