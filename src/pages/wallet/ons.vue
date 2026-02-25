<template>
  <q-page class="ons-page">
    <div class="header row items-center justify-center q-pt-md">
      <q-btn-toggle
        v-model="screen"
        toggle-color="primary"
        color="accent"
        :options="[
          {
            label: $t('titles.ons.purchase'),
            value: 'purchase'
          },
          {
            label: $t('titles.ons.myOns'),
            value: 'my_ons'
          }
        ]"
      />
    </div>
    <ONSPurchase v-if="screen === 'purchase'" ref="purchase" />
    <MyONS v-if="screen === 'my_ons'" @onUpdate="onUpdate" @onRenew="onRenew" />
  </q-page>
</template>

<script>
import ONSPurchase from "components/ons/ons_purchase";
import MyONS from "components/ons/ons_myons";
import { nextTick } from "vue";

export default {
  components: {
    MyONS,
    ONSPurchase
  },
  data() {
    return {
      screen: "purchase"
    };
  },
  methods: {
    purchasePageAction(record, action) {
      // don't update the pointer to the record (else it'll update on the records page)
      // structuredClone cannot clone Vue reactive proxies, use JSON round-trip instead
      let recordCopy = JSON.parse(JSON.stringify(record));

      if (record.type === "lokinet" && record.name.endsWith(".loki")) {
        // The UI expects no ".loki" extension
        recordCopy.name = recordCopy.name.slice(0, -5);
        recordCopy.value = recordCopy.value.slice(0, -5);
      }
      this.screen = "purchase";
      // refs are not dynamic, so let the purchase tab render
      // then we can call the ref method
      nextTick().then(() => {
        this.$refs.purchase[action](recordCopy);
      });
    },
    onUpdate(record) {
      let updateRecord = {
        ...record,
        // Don't pre-fill these fields on update
        value: "",
        owner: "",
        backup_owner: ""
      };
      this.purchasePageAction(updateRecord, "startUpdating");
    },
    onRenew(record) {
      this.purchasePageAction(record, "startRenewing");
    }
  }
};
</script>

<style lang="scss"></style>
