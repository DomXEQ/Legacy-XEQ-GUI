import { Daemon } from "./daemon";
import { WalletRPC } from "./wallet-rpc";
import { SCEE } from "./SCEE-Node";
import { dialog } from "electron";
import semver from "semver";
import axios from "axios";
import { version } from "../../../package.json";
const bunyan = require("bunyan");

const WebSocket = require("ws");
const electron = require("electron");
const os = require("os");
const fs = require("fs-extra");
const path = require("upath");
const objectAssignDeep = require("object-assign-deep");

const { ipcMain: ipc } = electron;

const LOG_LEVELS = ["fatal", "error", "warn", "info", "debug", "trace"];

export class Backend {
  constructor(mainWindow) {
    this.mainWindow = mainWindow;
    this.daemon = null;
    this.walletd = null;
    this.wss = null;
    this.token = null;
    this.config_dir = null;
    this.wallet_dir = null;
    this.config_file = null;
    this.config_data = {};
    this.scee = new SCEE();
    this.log = null;
  }

  init(config) {
    let configDir;
    if (os.platform() === "win32") {
      configDir = path.join(process.env.ProgramData || "C:\\ProgramData", "legacy-xeq-gui");
    } else {
      configDir = path.join(os.homedir(), ".legacy-xeq-gui");
    }
    this.wallet_dir = path.join(process.cwd(), "wallets");

    this.config_dir = configDir;
    if (!fs.existsSync(configDir)) {
      fs.mkdirpSync(configDir);
    }

    if (!fs.existsSync(path.join(this.config_dir, "gui"))) {
      fs.mkdirpSync(path.join(this.config_dir, "gui"));
    }

    this.config_file = path.join(this.config_dir, "gui", "config.json");

    const daemon = {
      type: "remote",
      p2p_bind_ip: "0.0.0.0",
      p2p_bind_port: 9230,
      rpc_bind_ip: "127.0.0.1",
      rpc_bind_port: 9231,
      zmq_rpc_bind_ip: "127.0.0.1",
      out_peers: -1,
      in_peers: -1,
      limit_rate_up: -1,
      limit_rate_down: -1,
      log_level: 0
    };

    const daemons = {
      mainnet: {
        ...daemon,
        remote_host: "us.equilibriacc.com",
        remote_port: 9231
      },
      stagenet: {
        ...daemon,
        type: "local",
        p2p_bind_port: 38153,
        rpc_bind_port: 38154
      },
      testnet: {
        ...daemon,
        type: "remote",
        remote_host: "127.0.0.1",
        remote_port: 18091,
        p2p_bind_port: 18090,
        rpc_bind_port: 18091
      }
    };

    // Default values
    // Use wallets folder in the application directory
    const defaultWalletDir = path.join(process.cwd(), "wallets");
    this.defaults = {
      daemons: objectAssignDeep({}, daemons),
      app: {
        data_dir: this.config_dir,
        wallet_data_dir: defaultWalletDir,
        ws_bind_port: 12313,
        net_type: "mainnet"
      },
      wallet: {
        type: "local",
        rpc_bind_port: 22026,
        log_level: 0
      }
    };

    this.config_data = {
      // Copy all the properties of defaults
      ...objectAssignDeep({}, this.defaults),
      appearance: {
        theme: "dark"
      }
    };

    this.remotes = [
      {
        host: "us.equilibriacc.com",
        port: "9231"
      },
      {
        host: "eu.equilibriacc.com",
        port: "9231"
      },
      {
        host: "asia.equilibriacc.com",
        port: "9231"
      }
    ];

    this.token = config.token;

    this.wss = new WebSocket.Server({
      port: config.port,
      maxPayload: 10 * 1024 * 1024 // 10 MB cap; loopback only, prevents unbounded memory allocation
    });

    this.wss.on("connection", ws => {
      ws.on("message", data => this.receive(data));
    });
  }

  send(event, data = {}) {
    let message = {
      event,
      data
    };

    let encrypted_data = this.scee.encryptString(
      JSON.stringify(message),
      this.token
    );

    this.wss.clients.forEach(function each(client) {
      if (client.readyState === WebSocket.OPEN) {
        client.send(encrypted_data);
      }
    });
  }

  sendLog(level, message) {
    // Mirror to terminal so logs are visible without opening the GUI Troubleshooting tab
    const consoleFn = level === "error" ? console.error : level === "warn" ? console.warn : console.log;
    consoleFn(`[${level.toUpperCase()}] ${message}`);
    this.send("session_log", { level, message });
  }

  receive(data) {
    // ws v8+ delivers text frames as Buffer objects; convert to string so that
    // SCEE.decryptString can correctly base64-decode the ciphertext.
    const message = Buffer.isBuffer(data) ? data.toString("utf8") : String(data);
    let decrypted_data = JSON.parse(this.scee.decryptString(message, this.token));

    // route incoming request to either the daemon, wallet, or here
    switch (decrypted_data.module) {
      case "core":
        this.handle(decrypted_data);
        break;
      case "daemon":
        if (this.daemon) {
          this.daemon.handle(decrypted_data);
        }
        break;
      case "wallet":
        if (this.walletd) {
          this.walletd.handle(decrypted_data);
        }
        break;
    }
  }

  handle(data) {
    let params = data.data;

    // check if config has changed
    let config_changed = false;

    switch (data.method) {
      case "set_language":
        this.send("set_language", { lang: params.lang });
        break;
      case "quick_save_config":
        // save only partial config settings
        Object.keys(params).map(key => {
          this.config_data[key] = Object.assign(
            this.config_data[key],
            params[key]
          );
        });
        fs.writeFile(
          this.config_file,
          JSON.stringify(this.config_data, null, 4),
          "utf8",
          () => {
            this.send("set_app_data", {
              config: params,
              pending_config: params
            });
          }
        );
        break;
      case "save_config_init":
      case "save_config": {
        if (data.method === "save_config") {
          Object.keys(this.config_data).map(i => {
            if (i == "appearance") return;
            Object.keys(this.config_data[i]).map(j => {
              if (this.config_data[i][j] !== params[i][j]) {
                config_changed = true;
              }
            });
          });
        }

        Object.keys(params).map(key => {
          this.config_data[key] = Object.assign(
            this.config_data[key],
            params[key]
          );
        });

        const validated = Object.keys(this.defaults)
          .filter(k => k in this.config_data)
          .map(k => [
            k,
            this.validate_values(this.config_data[k], this.defaults[k])
          ])
          .reduce((map, obj) => {
            map[obj[0]] = obj[1];
            return map;
          }, {});

        // Validate daemon data
        this.config_data = {
          ...this.config_data,
          ...validated
        };

        fs.writeFile(
          this.config_file,
          JSON.stringify(this.config_data, null, 4),
          "utf8",
          () => {
            if (data.method == "save_config_init") {
              this.startup();
            } else {
              this.send("set_app_data", {
                config: this.config_data,
                pending_config: this.config_data
              });
              if (config_changed) {
                this.send("settings_changed_reboot");
              }
            }
          }
        );
        break;
      }
      case "init":
        this.startup();
        break;

      case "open_explorer": {
        const { net_type } = this.config_data.app;

        let path = null;
        if (params.type === "tx") {
          path = "tx";
        } else if (params.type === "service_node") {
          path = "sn";
        }

        if (path) {
          const baseUrl =
            net_type === "testnet"
              ? "https://testnet.oxen.observer"
              : "https://oxen.observer";
          const url = `${baseUrl}/${path}/`;
          require("electron").shell.openExternal(url + params.id);
        }
        break;
      }

      case "open_url":
        if (typeof params.url === "string" && params.url.startsWith("https://")) {
          require("electron").shell.openExternal(params.url);
        }
        break;

      case "save_png": {
        dialog
          .showSaveDialog(this.mainWindow, {
            title: "Save " + params.type,
            filters: [{ name: "PNG", extensions: ["png"] }],
            defaultPath: os.homedir()
          })
          .then(({ filePath }) => {
            if (filePath) {
              let base64Data = params.img.replace(
                /^data:image\/png;base64,/,
                ""
              );
              let binaryData = Buffer.from(base64Data, "base64").toString(
                "binary"
              );
              fs.writeFile(filePath, binaryData, "binary", err => {
                if (err) {
                  this.send("show_notification", {
                    type: "negative",
                    i18n: [
                      "notification.errors.errorSavingItem",
                      { item: params.type }
                    ],
                    timeout: 2000
                  });
                } else {
                  this.send("show_notification", {
                    i18n: [
                      "notification.positive.itemSaved",
                      { item: params.type, filename: filePath }
                    ],
                    timeout: 2000
                  });
                }
              });
            }
          });
        break;
      }

      default:
        break;
    }
  }
  // TODO: Update the GitHub releases URL below to the XEQ flagship wallet repo
  // once the release infrastructure is established.
  // Example: "https://api.github.com/repos/EquilibriaCC/xeq-electron-wallet/releases/latest"
  async checkVersion() {
    this.send("set_update_required", false);
  }

  initLogger(logPath) {
    let log = bunyan.createLogger({
      name: "log",
      streams: [
        {
          type: "rotating-file",
          path: path.join(logPath, "electron.log"),
          period: "1d", // daily rotation
          count: 4 // keep 4 days of logs
        }
      ]
    });

    LOG_LEVELS.forEach(level => {
      ipc.on(`log-${level}`, (first, ...rest) => {
        log[level](...rest);
      });
    });

    this.log = log;

    process.on("uncaughtException", error => {
      log.error("Unhandled Error", error);
    });

    process.on("unhandledRejection", error => {
      log.error("Unhandled Promise Rejection", error);
    });
  }

  startup() {
    this.send("set_app_data", {
      remotes: this.remotes,
      defaults: this.defaults
    });

    this.sendLog("info", `Platform: ${os.platform()}, arch: ${os.arch()}`);
    this.sendLog("info", `Config dir: ${this.config_dir}`);
    this.sendLog("info", `Wallet dir: ${this.wallet_dir}`);
    this.sendLog("info", `Working dir: ${process.cwd()}`);

    this.checkVersion();

    fs.readFile(this.config_file, "utf8", (err, data) => {
      if (err) {
        // First run — no config file. Save defaults to disk and auto-start
        // using the default US remote node without showing the setup wizard.
        fs.writeFile(
          this.config_file,
          JSON.stringify(this.config_data, null, 4),
          "utf8",
          () => {}
        );
      } else {
        // Remove BOM (Byte Order Mark) if present
        if (data.charCodeAt(0) === 0xfeff) {
          data = data.slice(1);
        }

        let disk_config_data = JSON.parse(data);

        // semi-shallow object merge
        Object.keys(disk_config_data).map(key => {
          if (!this.config_data.hasOwnProperty(key)) {
            this.config_data[key] = {};
          }
          this.config_data[key] = Object.assign(
            this.config_data[key],
            disk_config_data[key]
          );
        });
      }

      // here we may want to check if config data is valid, if not also send code -1
      // i.e. check ports are integers and > 1024, check that data dir path exists, etc
      const validated = Object.keys(this.defaults)
        .filter(k => k in this.config_data)
        .map(k => [
          k,
          this.validate_values(this.config_data[k], this.defaults[k])
        ])
        .reduce((map, obj) => {
          map[obj[0]] = obj[1];
          return map;
        }, {});

      // Make sure the daemon data is valid
      this.config_data = {
        ...this.config_data,
        ...validated
      };

      // Migrate local_remote -> remote (option removed for Legacy XEQ)
      for (const net of ["mainnet", "stagenet", "testnet"]) {
        if (
          this.config_data.daemons &&
          this.config_data.daemons[net] &&
          this.config_data.daemons[net].type === "local_remote"
        ) {
          this.config_data.daemons[net].type = "remote";
        }
      }

      // save config file back to file, so updated options are stored on disk
      fs.writeFile(
        this.config_file,
        JSON.stringify(this.config_data, null, 4),
        "utf8",
        () => {}
      );

      this.send("set_app_data", {
        config: this.config_data,
        pending_config: this.config_data
      });

      // Make the wallet dir
      const { wallet_data_dir, data_dir } = this.config_data.app;
      // Ensure wallet_data_dir uses the wallets folder in project root
      const defaultWalletDir = path.join(process.cwd(), "wallets");
      if (
        !this.config_data.app.wallet_data_dir ||
        this.config_data.app.wallet_data_dir !== defaultWalletDir
      ) {
        // Update to use the wallets folder if it's different
        this.config_data.app.wallet_data_dir = defaultWalletDir;
      }
      if (!fs.existsSync(this.config_data.app.wallet_data_dir)) {
        fs.mkdirpSync(this.config_data.app.wallet_data_dir);
      }
      console.log(
        `[Backend] Wallet directory set to: ${this.config_data.app.wallet_data_dir}`
      );

      // Ensure data and wallet directories exist (create if missing)
      const dirs_to_check = [data_dir, wallet_data_dir];
      for (const dir of dirs_to_check) {
        if (!fs.existsSync(dir)) {
          try {
            fs.mkdirpSync(dir);
            console.log(`[Backend] Created missing directory: ${dir}`);
          } catch (e) {
            console.error(`[Backend] Failed to create directory: ${dir}`, e);
            this.sendLog(
              "error",
              `Failed to create directory: ${dir} — ${e.message}`
            );
            this.send("show_notification", {
              type: "negative",
              message: `Failed to create directory: ${dir}`,
              timeout: 3000
            });
            this.send("set_app_data", {
              status: {
                code: -1
              }
            });
            return;
          }
        }
      }

      const { net_type } = this.config_data.app;

      const dirs = {
        mainnet: this.config_data.app.data_dir,
        stagenet: path.join(this.config_data.app.data_dir, "stagenet"),
        testnet: path.join(this.config_data.app.data_dir, "testnet")
      };

      // Make sure we have the directories we need
      const net_dir = dirs[net_type];
      if (!fs.existsSync(net_dir)) {
        fs.mkdirpSync(net_dir);
      }

      const log_dir = path.join(net_dir, "logs");
      if (!fs.existsSync(log_dir)) {
        fs.mkdirpSync(log_dir);
      }

      this.initLogger(log_dir);

      this.daemon = new Daemon(this);
      this.walletd = new WalletRPC(this);

      this.sendLog("info", "Backend initialized, starting daemon...");

      this.send("set_app_data", {
        status: {
          code: 3 // Starting daemon
        }
      });

      this.daemon.checkVersion().then(version => {
        if (version) {
          this.send("set_app_data", {
            status: {
              code: 4,
              message: version
            }
          });
        } else {
          // daemon binary not found (e.g. removed by AV) — force remote mode
          this.config_data.daemons[net_type].type = "remote";
          this.send("set_app_data", {
            status: { code: 5 },
            config: this.config_data,
            pending_config: this.config_data
          });
        }

        this.daemon.start(this.config_data).then(() => {
          this.send("set_app_data", { status: { code: 6 } }); // Starting wallet

          this.walletd
            .start(this.config_data)
            .then(() => {
              this.send("set_app_data", { status: { code: 7 } }); // Reading wallet list
              this.walletd.listWallets(true);
              this.send("set_app_data", { status: { code: 0 } }); // Ready
            })
            .catch(error => {
              console.error("[Backend] Error starting wallet RPC:", error);
              this.sendLog("error", `Error starting wallet RPC: ${error.message || error}`);
              this.send("show_notification", {
                type: "negative",
                message: `Error starting wallet RPC: ${error.message || error}`,
                timeout: 5000
              });
              this.send("set_app_data", { status: { code: -1 } });
            });
        }).catch(error => {
          // Daemon unreachable — still start wallet-rpc so users can create wallets offline
          const msg = error && error.message ? error.message : String(error || "unknown");
          this.sendLog("warn", `Daemon unreachable: ${msg}. Attempting offline mode.`);
          this.send("show_notification", {
            type: "warning",
            message: "Could not connect to daemon. You can still create a new wallet.",
            timeout: 6000
          });
          this.send("set_app_data", { status: { code: 6 } }); // Starting wallet...
          this.walletd
            .start(this.config_data)
            .then(() => {
              this.send("set_app_data", { status: { code: 7 } });
              this.walletd.listWallets(true);
              this.send("set_app_data", { status: { code: 8 } }); // Offline mode — route to wallet-select
            })
            .catch(walletError => {
              const wMsg = walletError && walletError.message ? walletError.message : String(walletError || "unknown");
              this.sendLog("error", `Wallet RPC also failed in offline mode: ${wMsg}`);
              this.send("show_notification", {
                type: "negative",
                message: `Could not start wallet: ${wMsg}`,
                timeout: 5000
              });
              this.send("set_app_data", { status: { code: -1 } });
            });
        });
      }).catch(error => {
        console.error("[Backend] Error checking daemon version:", error);
        this.sendLog("error", `Error checking daemon version: ${error.message || error}`);
        this.send("show_notification", {
          type: "negative",
          message: `Error checking daemon version: ${error.message || error}`,
          timeout: 5000
        });
        this.send("set_app_data", { status: { code: -1 } });
      });
    }); // closes fs.readFile callback
  } // closes startup() method

  quit() {
    return new Promise(resolve => {
      let process = [];
      if (this.daemon) {
        process.push(this.daemon.quit());
      }
      if (this.walletd) {
        process.push(this.walletd.quit());
      }
      if (this.wss) {
        this.wss.close();
      }

      Promise.all(process).then(() => {
        resolve();
      });
    });
  }

  // Replace any invalid value with default values
  validate_values(values, defaults) {
    const isDictionary = v =>
      typeof v === "object" &&
      v !== null &&
      !(v instanceof Array) &&
      !(v instanceof Date);
    const modified = { ...values };

    // Make sure we have valid defaults
    if (!isDictionary(defaults)) return modified;

    for (const key in modified) {
      // Only modify if we have a default
      if (!(key in defaults)) continue;

      const defaultValue = defaults[key];
      const invalidDefault =
        defaultValue === null ||
        defaultValue === undefined ||
        Number.isNaN(defaultValue);
      if (invalidDefault) continue;

      const value = modified[key];

      // If we have a object then recurse through it
      if (isDictionary(value)) {
        modified[key] = this.validate_values(value, defaultValue);
      } else {
        // Check if we need to replace the value
        const isValidValue = !(
          value === undefined ||
          value === null ||
          value === "" ||
          Number.isNaN(value)
        );
        if (isValidValue) continue;

        // Otherwise set the default value
        modified[key] = defaultValue;
      }
    }
    return modified;
  }
}
