<template>
  <div class="oxen-field" :class="{ disable, 'disable-hover': disableHover }">
    <div v-if="label" class="label row items-center" :disabled="disable">
      {{ label }}
      <span v-if="optional" class="optional"
        >({{ $t("fieldLabels.optional") }})</span
      >
    </div>
    <div class="content row items-center" :class="{ error }">
      <slot></slot>
    </div>
    <div v-if="error && errorLabel" class="error-label" :disabled="disable">
      {{ errorLabel }}
    </div>
  </div>
</template>

<script>
export default {
  name: "OxenField",
  props: {
    label: {
      type: String,
      required: false,
      default: undefined
    },
    error: {
      type: Boolean,
      required: false,
      default: false
    },
    errorLabel: {
      type: String,
      required: false,
      default: undefined
    },
    optional: {
      type: Boolean,
      required: false,
      default: false
    },
    disable: {
      type: Boolean,
      required: false,
      default: false
    },
    disableHover: {
      type: Boolean,
      required: false,
      default: false
    }
  },
  data() {
    return {};
  }
};
</script>

<style lang="scss">
.oxen-field {
  .label {
    margin: 6px 0;
    font-weight: 500;
    font-size: 12px;
    color: rgba(255, 255, 255, 0.6);

    // Disable text selection
    -webkit-user-select: none;
    user-select: none;
    cursor: default;

    .optional {
      font-weight: 400;
      margin-left: 4px;
      color: rgba(255, 255, 255, 0.35);
    }
  }
  .content {
    border-radius: 8px;
    padding: 6px 12px;
    min-height: 46px;

    > * {
      margin-right: 4px;
    }

    > *:last-child {
      margin-right: 0px;
    }

    .q-input,
    .q-select {
      flex: 1;
      margin: 0;

      * {
        color: rgba(255, 255, 255, 0.92);
      }

      input::placeholder,
      textarea::placeholder {
        color: rgba(255, 255, 255, 0.35) !important;
      }
    }

    .q-select {
      .row {
        color: rgba(255, 255, 255, 0.92);
      }
    }

    .q-date {
      min-width: 100%;
      max-width: 100%;
    }

    .q-btn {
      padding: 4px 12px;
      font-size: 12px !important;
      border-radius: 6px;
    }
  }

  .error-label {
    color: #ff4757;
    font-size: 11px;
    margin-top: 4px;
  }
}
</style>
