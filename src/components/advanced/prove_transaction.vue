<template>
  <div class="prove-transaction">
    <div class="q-pa-md">
      <div class="q-mb-lg tab-desc">
        {{ $t("strings.proveTransactionDescription") }}
      </div>
      <div>
        <OxenField
          :label="$t('fieldLabels.transactionId')"
          :error="$v.txid.$error"
        >
          <q-input
            v-model.trim="txid"
            :dark="theme == 'dark'"
            :placeholder="$t('placeholders.pasteTransactionId')"
            borderless
            dense
            @blur="$v.txid.$touch"
          />
        </OxenField>
        <OxenField
          class="q-mt-md"
          label="RECEIVING ADDRESS"
          :error="$v.address.$error"
        >
          <q-input
            v-model.trim="address"
            :dark="theme == 'dark'"
            :placeholder="$t('placeholders.recipientWalletAddress')"
            borderless
            dense
            @blur="$v.address.$touch"
          />
        </OxenField>
        <!-- New XEQ Mainnet only: message field hidden for Legacy XEQ swap
        <OxenField class="q-mt-md" :label="$t('fieldLabels.message')" optional>
          <q-input
            v-model.trim="message"
            :dark="theme == 'dark'"
            :placeholder="$t('placeholders.proveOptionalMessage')"
            borderless
            dense
          />
        </OxenField>
        -->
        <div class="buttons submit-button">
          <q-btn
            color="primary"
            :label="$t('buttons.generate')"
            :loading="status.code === 1"
            :disable="status.code === 1"
            @click="generate"
          />
          <q-btn
            v-if="canClear"
            color="accent"
            :label="$t('buttons.clear')"
            @click="clear"
          />
          <q-btn
            v-if="status.state.signature"
            color="secondary"
            :label="$t('buttons.copySignature')"
            @click="copy"
          />
        </div>
      </div>
      <div v-if="status.state.signature" class="signature-wrapper">
        <div class="txid q-mb-sm">
          <div class="title">{{ $t("strings.transactionID") }}</div>
          <div>{{ status.state.txid }}</div>
        </div>
        <div
          class="title q-mt-md"
          style="font-weight: 600; color: rgba(255,255,255,0.7);"
        >
          Transaction Proof
        </div>
        <p class="signature">
          {{ status.state.signature }}
        </p>
        <div
          class="swap-portal-link q-mt-md"
          style="
          padding: 12px;
          background: rgba(0, 212, 255, 0.06);
          border: 1px solid rgba(0, 212, 255, 0.2);
          border-radius: 8px;
          text-align: center;
          font-size: 13px;
          line-height: 1.6;
        "
        >
          <div style="color: rgba(255,255,255,0.8); margin-bottom: 8px;">
            Proof generated! Now go to the swap portal to submit your
            Transaction ID and proof.
          </div>
          <a
            href="#"
            style="color: #00d4ff; text-decoration: underline; font-weight: 600;"
            @click.prevent="openSwapPortal"
          >
            Open Swap Portal →
          </a>
        </div>
      </div>
    </div>
  </div>
</template>

<script>
import { mapState } from "vuex";
import { required } from "vuelidate/lib/validators";
import { address } from "src/validators/common";
import OxenField from "components/oxen_field";
import { clipboard } from "electron";

export default {
  name: "ProveTransaction",
  components: {
    OxenField
  },
  data() {
    return {
      txid: "",
      address: "",
      message: ""
    };
  },
  computed: mapState({
    theme: state => state.gateway.app.config.appearance.theme,
    status: state => state.gateway.prove_transaction_status,
    canClear() {
      return this.txid !== "" || this.address !== "" || this.message !== "";
    }
  }),
  watch: {
    "$route.query": {
      handler() {
        this.resetAndApplyQuery();
      },
      deep: true
    },
    status: {
      handler(val, old) {
        if (val.code == old.code) return;
        const { code, message } = val;
        switch (code) {
          case -1:
            this.$q.notify({
              type: "negative",
              timeout: 3000,
              message
            });
            break;
        }
      },
      deep: true
    }
  },
  mounted() {
    this.resetAndApplyQuery();
  },
  activated() {
    this.resetAndApplyQuery();
  },
  validations: {
    txid: { required },
    address: {
      required,
      isAddress(value) {
        if (value === "") return true;

        return new Promise(resolve => {
          address(value, this.$gateway)
            .then(() => resolve(true))
            .catch(() => resolve(false));
        });
      }
    }
  },
  methods: {
    resetAndApplyQuery() {
      this.txid = "";
      this.address = "";
      this.message = "";
      this.$v.$reset();
      this.$store.commit("gateway/set_prove_transaction_status", {
        code: 0,
        message: "",
        i18n: "",
        state: {}
      });
      const query = this.$route.query;
      if (query && query.txid) {
        this.txid = query.txid;
      }
    },
    generate() {
      this.$v.txid.$touch();
      this.$v.address.$touch();

      if (this.$v.txid.$error) {
        this.$q.notify({
          type: "negative",
          timeout: 1000,
          message: this.$t("notification.errors.enterTransactionId")
        });
        return;
      }

      if (this.$v.address.$error) {
        const msg =
          this.address === ""
            ? "Please enter the receiving wallet address"
            : this.$t("notification.errors.invalidAddress");
        this.$q.notify({
          type: "negative",
          timeout: 2000,
          message: msg
        });
        return;
      }

      this.$gateway.send("wallet", "prove_transaction", {
        txid: this.txid.trim(),
        address: this.address.trim(),
        message: this.message.trim()
      });
    },
    clear() {
      this.txid = "";
      this.address = "";
      this.message = "";
      this.$v.$reset();
    },
    copy() {
      clipboard.writeText(this.status.state.signature);
      this.$q.notify({
        type: "positive",
        timeout: 1000,
        message: this.$t("notification.positive.signatureCopied")
      });
    },
    openSwapPortal() {
      this.$gateway.send("core", "open_url", {
        url: "https://swap-testnet.xeqlabs.com/"
      });
    }
  }
};
</script>

<style lang="scss">
.signature-wrapper {
  margin-top: 12px;
}

.prove-transaction {
  .description {
    white-space: pre-line;
  }
  .buttons {
    .q-btn:not(:first-child) {
      margin-left: 8px;
    }
  }
  .signature {
    flex: 1;
    word-break: break-all;
    word-wrap: break-word;
    -webkit-user-select: all;
    user-select: all;
    padding: 8px;
  }
}
</style>
