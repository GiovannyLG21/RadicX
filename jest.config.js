/* global module */
import { createDefaultPreset } from "ts-jest"

const tsJestTransformCfg = createDefaultPreset().transform

/** @type {import("jest").Config} **/
module.exports = {
	testEnvironment: "node",
	transform: {
		...tsJestTransformCfg,
	},
	moduleNameMapper: {
		'^@/(.*)$': '<rootDir>/src/$1'
	},
	setupFilesAfterEnv: ["<rootDir>/test/jest.setup.ts"],	
}