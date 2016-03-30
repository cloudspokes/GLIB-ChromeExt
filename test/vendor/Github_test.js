'use strict';
var chai = require('chai'),
  jsdom = require('jsdom'),
  sinon = require('sinon'),
  Github;

var expect = chai.expect,
  should = chai.should();

var $;

describe('Github Vendor function.', function() {

  var runRegExpOnPathnameStub;
  beforeEach(function(beforeDone) {
    Github = require('../../src/vendor/Github.js');
    jsdom.env({
      html: "<html><body></body></html>",
      scripts: [
        'http://code.jquery.com/jquery-1.5.min.js'
      ],
      done: function (err, window) {
        $ = window.jQuery;

        $('body').append("<div class='testing'>Hello World</div>");
        global.document = window.document;
        console.log($(".testing").text()); // outputs Hello World
        beforeDone();
      }
    });
  });
  
  it('Should verify Github object.', function(testDone) {
    Github.should.be.an('object');
    expect(Github.owner).to.be.undefined;
    expect(Github.repo).to.be.undefined;
    expect(Github.issueId).to.be.undefined;
    testDone();
  });

  describe('isEnabled()', function() {
    beforeEach(function(beforeDone) {
      runRegExpOnPathnameStub = sinon.stub(Github, "runRegExpOnPathname");
      beforeDone();
    });

    afterEach(function(afterDone) {
      runRegExpOnPathnameStub.restore();
      afterDone();
    });

    it('Should return false if url does not match issues.', function(testDone) {
      var enabled;
      runRegExpOnPathnameStub.returns(null);
      enabled = Github.isEnabled();
      enabled.should.equal(false);
      testDone();
    });
    
    describe('Issues page.', function() {
      var owner = 'tcDeveloper',
        repo = 'aTestRepo',
        issueId = '5';
      
      beforeEach(function(beforeDone) {
        runRegExpOnPathnameStub.returns(['fake', owner, repo, issueId]);
        beforeDone();
      });

      it('Should set the values and exit if no show_issue element is found', function(testDone) {
        var enabled;
        enabled = Github.isEnabled();
        enabled.should.equal(false);
        Github.repo.should.equal(repo);
        Github.owner.should.equal(owner);
        Github.issueId.should.equal(issueId);
        testDone();
      });
      
      describe('show_issue exists', function() {
        beforeEach(function (beforeDone) {
          $('body').append('<div id="show_issue"></div>');
          beforeDone();
        });

        afterEach(function (afterDone) {
          $('show_issue').remove();
          afterDone();
        });

        it('Should return false if no wrapper element exists', function (testDone) {
          var enabled;

          enabled = Github.isEnabled();
          enabled.should.equal(false);
          Github.repo.should.equal(repo);
          Github.owner.should.equal(owner);
          Github.issueId.should.equal(issueId);

          testDone();
        });
      });
      
      describe('wrapper exists', function() {
        beforeEach(function (beforeDone) {
          $('body').append('<div id="show_issue"><div id="test" class="gh-header-actions"><div id="immaWrapper"></div></div></div>');
          beforeDone();
        });

        afterEach(function (afterDone) {
          $('show_issue').remove();
          afterDone();
        });

        it('Should be enabled if all conditions pass.', function(testDone) {
          var enabled = Github.isEnabled();
          enabled.should.equal(true);
          Github.repo.should.equal(repo);
          Github.owner.should.equal(owner);
          Github.issueId.should.equal(issueId);

          testDone();
        });
      })
    });

  });

  describe('addButton()', function() {

    beforeEach(function (beforeDone) {
      $('body').append('<div id="show_issue"><div class="gh-header-actions"><div id="immaWrapper"></div></div></div>');
      beforeDone();
    });

    afterEach(function (afterDone) {
      $('show_issue').remove();
      afterDone();
    });

    it('Should be enabled if all conditions pass.', function(testDone) {
      var btn = document.createElement('button');
      btn.className = 'btn btn-sm btn-default btn-topcoder';
      btn.innerHTML = 'Topcoder';
      Github.addButton(btn);
      should.exist($('.btn-topcoder'));
      testDone();
    });

  });   
  
});