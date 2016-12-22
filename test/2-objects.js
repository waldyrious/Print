"use strict";

const fs     = require("fs");
const print  = require("../print.js");
const Chai   = require("./chai-spice.js");
const {expect} = Chai;


Chai.untab = 2;

describe("Basic objects", function(){
	
	it("Prints simple objects", () => {
		expect({
			word: "String",
			number: 1024 * 768,
			object: {},
			list: []
		}).to.print(`{
			list: []
			number: 786432
			object: {}
			word: "String"
		}`);
	});
	
	
	it("Prints empty objects on one line", () => {
		expect({}).to.print("{}");
	});
	
	
	it("Prints argument-objects", () => {
		const args = (function(){
			return arguments;
		}("A", "B", {a: "C"}));
		
		expect(args).to.print(`Arguments[
			"A"
			"B"
			{
				a: "C"
			}
			@@Symbol.iterator: function(){
				length: 0
				name: "values"
			}
		]`)
	});
	
	
	describe("Property names", () => {
		Chai.untab = 3;
		
		const input = [
			{
				gamma: "G",
				delta: "D",
				alpha: "A",
				beta:  "B",
				quux:  "Q",
				__FB:  "FooBar"
			},
			
			{
				ZZZZ: 0,
				aaaa: 1,
				AaAA: 2,
				bbBB: 3
			}
		];
		
		it("Alphabetises each property's name by default", () => {
			expect(input[0]).to.print(`{
				__FB: "FooBar"
				alpha: "A"
				beta: "B"
				delta: "D"
				gamma: "G"
				quux: "Q"
			}`);
		});
		
		it("Alphabetises case-insensitively", () => {
			expect(input[1]).to.print(`{
				aaaa: 1
				AaAA: 2
				bbBB: 3
				ZZZZ: 0
			}`);
		});
		
		it("Preserves enumeration order if sortProps is disabled", () => {
			expect(input[0]).to.print(`{
				gamma: "G"
				delta: "D"
				alpha: "A"
				beta: "B"
				quux: "Q"
				__FB: "FooBar"
			}`, {sortProps: false});
		});
		
		const symb = Symbol("Fancy-Symbol");
		it("Uses a @@-prefix to indicate Symbol-keyed properties", () => {
			expect({[symb]: true}).to.print(`{
				@@Fancy-Symbol: true
			}`);
		});
		
		it("Omits the @@-prefix if ampedSymbols is disabled", () => {
			expect({[symb]: true}).to.print(`{
				Symbol(Fancy-Symbol): true
			}`, {ampedSymbols: false})
		});
	});
});



describe("Errors", function(){
	
	it("Prints standard errors", () => {
		expect(new Error("Nope")).to.print(`Error{
			message: "Nope"
			name: "Error"
		}`);
	});
	
	it("Prints AssertionErrors", () => {
		let error;
		try{ require("assert").equal(true, false, "Wrong"); }
		catch(e){ error = e; }
		
		error.intentional = true;
		expect(error).to.print(`AssertionError{
			actual: true
			expected: false
			generatedMessage: false
			intentional: true
			message: "Wrong"
			name: "AssertionError"
			operator: "=="
		}`);
	});
});


describe("Functions", () => {
	
	it("Prints function objects", () => {
		const func = function(i){ return i + 2 }
		expect(func).to.print(`function(){
			length: 1
			name: "func"
		}`);
	});
	
	it("Prints nameless functions", () => {
		expect(function(){return "A"}).to.print(`function(){
			length: 0
			name: ""
		}`);
	});
	
	it("Prints functions in objects", () => {
		expect({
			func: function fn(value){
				return value;
			}
		}).to.print(`{
			func: function(){
				length: 1
				name: "fn"
			}
		}`);
	});
	
	it("Recognises generator functions", () => {
		const obj = { money: function* generator(){ yield $20; } };
		expect(obj).to.print(`{
			money: function*(){
				length: 0
				name: "generator"
			}
		}`);
	});
	
	it("Avoids breaking on absent constructors", () => {
		const obj = {get constructor(){ return undefined }};
		expect(obj).to.print(`{
			constructor: undefined
		}`);
	});
});



describe("Classes", function(){
	Chai.untab = 3;
	
	class Example{
		constructor(){
			this.name = "Foo";
		}
	}
	
	class ExtendedExample extends Example{
		constructor(){
			super();
			this.name = "Bar";
		}
	}

	it("Prints class instances", () => {
		expect(new Example()).to.print(`
			Example{
				name: "Foo"
			}
		`);
	});
	
	
	it("Prints instances of subclasses", () => {
		expect(new ExtendedExample()).to.print(`
			ExtendedExample{
				name: "Bar"
			}
		`)
	});
});



describe("Dates", () => {
	Chai.untab = 0;
	
	it("Prints the date's value in ISO format", () => {
		const date = new Date("2000-12-31T18:02:16.555Z");
		expect(print(date)).to.match(/^Date{\n\t2000-12-31 18:02:16\.555 GMT\n\t\d+ years ago\n}$/)
	});
	
	it("Trims zeroes from the millisecond component", () => {
		const dates = [
			["16.000Z", "16 GMT"],
			["16.120Z", "16.12 GMT"],
			["16.050Z", "16.05 GMT"],
			["16.500Z", "16.5 GMT"]
		];
		for(const [before, after] of dates){
			const date = new Date(`2016-12-31 18:02:${before}`);
			const line = print(date).split(/\n/)[1];
			expect(line).to.equal(`\t2016-12-31 18:02:${after}`);
		}
	});
	
	it("Shows named properties", () => {
		const date = new Date("2000-10-10T10:02:02Z");
		date.foo = "bar";
		date.list = ["Alpha", "Beta", "Delta"];
		expect(print(date)).to.match(/^Date{\n\t2000-10-10 10:02:02 GMT\n\t\d+ years ago\n\t\n\tfoo: "bar"\n\tlist: \[\n\t\t"Alpha"\n\t\t"Beta"\n\t\t"Delta"\n\t\]\n}$/);
	});
	
	describe("Time differences", () => {
		let suffix = "ago";
		let future = false;
		
		const tests = [
			["Includes a human-readable time difference", function(){
				const dates = [
					[1500000, "25 minutes"],
					[120000,   "2 minutes"],
					[2000,     "2 seconds"],
					[50000,   "50 seconds"],
					[13680000, "3.8 hours"],
					[388800000, "4.5 days"],
					[10512e6,   "4 months"],
					[126144e6,   "4 years"]
				];
				for(let [offset, diff] of dates){
					if(future) offset = -offset;
					const date = new Date(Date.now() - offset);
					const line = print(date).split(/\n/)[2];
					expect(line).to.equal(`\t${diff} ${suffix}`);
				}
			}],
			
			["Rounds differences off to 1 decimal place", function(){
				const dates = [
					[11719800, "3.3 hours"],
					[487296000, "5.6 days"],
					[211620, "3.5 minutes"],
					[13201560, "3.7 hours"]
				];
				for(let [offset, diff] of dates){
					if(future) offset = -offset;
					const date = new Date(Date.now() - offset);
					const line = print(date).split(/\n/)[2];
					expect(line).to.equal(`\t${diff} ${suffix}`);
				}
			}],
			
			["Doesn't display fractional seconds", function(){
				const date = new Date(Date.now() - (future ? -2500 : 2500));
				const line = print(date).split(/\n/)[2];
				expect(line).to.equal("\t3 seconds " + suffix);
			}],
			
			["Doesn't display fractional intervals longer than a week", function(){
				const dates = [
					[9637138800, "4 months"],
					[1343520000,  "16 days"],
					[1321920000,  "15 days"],
					[725760000,    "8 days"],
					[743040000,    "9 days"],
					[570240000,  "6.6 days"]
				];
				for(let [offset, diff] of dates){
					if(future) offset = -offset;
					const date = new Date(Date.now() - offset);
					const line = print(date).split(/\n/)[2];
					expect(line).to.equal(`\t${diff} ${suffix}`);
				}
			}]
		];
		
		for(const [testName, testHandler] of tests)
			it(testName, testHandler);
		
		suffix = "from now";
		future = true;
		
		it("Can read dates in the future", () => {
			for(const [testName, testHandler] of tests)
				testHandler();
		});
	});
});
