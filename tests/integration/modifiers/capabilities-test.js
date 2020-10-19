import { module, test } from 'qunit';
import { gte } from 'ember-compatibility-helpers';
import { setupRenderingTest } from 'ember-qunit';
import { hbs } from 'ember-cli-htmlbars';
import { render, settled, setupOnerror } from '@ember/test-helpers';

import { action } from '@ember/object';
import Component from '@glimmer/component';
import { tracked } from '@glimmer/tracking';
import { setComponentTemplate } from '@ember/component';
import { helper } from '@ember/component/helper';

module('Integration | capabilities', function(hooks) {
  setupRenderingTest(hooks);

  module('Migrating from non-proxied args to proxied args: emberjs/ember.js#19162', function() {
    // This test verifies https://github.com/emberjs/ember.js/issues/19162
    // is fixed
    //
    // These tests follow the reproduction:
    // https://ember-twiddle.com/5a3fa797b26e8807869340792219a5ee
    if (gte('3.22.0')) {
      module('capabilities(3.22)', function() {
        test('there is no render error', async function(assert) {
          assert.expect(16);

          let inserts = 0;
          let updates = 0;
          let destroys = 0;

          class Baz {
            @tracked kind = 'baz';
            @tracked nestedData = undefined;
          }

          class Foo {
            @tracked kind = 'foo';
            @tracked nestedData = new Baz();
          }

          class TestComponent extends Component {
            @tracked data = new Foo();

            get derivedData() {
              return this.args.data.nestedData.kind;
            }

            @action didInsert() {
              inserts++;
            }
            @action notTheOldUpdate() {
              updates++;
            }
            @action willDestroy() {
              destroys++;
            }
          }

          this.owner.register(
            'helper:eq',
            helper(([a, b]) => a === b)
          );
          this.owner.register(
            'component:some-component',
            setComponentTemplate(
              hbs`
                <div
                  {{did-insert this.didInsert this.derivedData}}
                  {{did-update this.notTheOldUpdate this.derivedData}}
                  {{will-destroy this.willDestroy}}
                >
                  {{@data.kind}}
                </div>
              `,
              TestComponent
            )
          );

          setupOnerror(function(err) {
            assert.notOk(err, 'Did not expect to error');
          });

          await render(
            hbs`
              {{#if (eq this.data.kind "foo")}}
                <SomeComponent @data={{this.data}} />
              {{else}}
                bar
              {{/if}}
            `
          );

          this.setProperties({ data: {} });

          assert.equal(inserts, 0, 'no initial insert');
          assert.equal(updates, 0, 'no initial update');
          assert.equal(destroys, 0, 'no initial destroy');

          this.setProperties({ data: new Foo() });

          assert.equal(inserts, 1, `modifier was inserted`);
          assert.equal(updates, 0, 'no update');
          assert.equal(destroys, 0, 'no destroy');

          this.set('data.kind', 'foo');

          assert.equal(inserts, 1, 'no new inserts');
          assert.equal(updates, 1, 'modifier update called');
          assert.equal(destroys, 0, 'no destroy');

          assert.dom().containsText('foo');
          assert.dom().doesNotContainText('bar');

          this.setProperties({ data: new Baz() });

          assert.equal(inserts, 1, 'no new inserts');
          assert.equal(updates, 1, 'no new updates');
          assert.equal(destroys, 1, 'modifier destroyed');

          assert.dom().doesNotContainText('foo');
          assert.dom().containsText('bar');
        });
      });
    } else {
      module('capabilities(3.13)', function() {});
    }
  });
});
