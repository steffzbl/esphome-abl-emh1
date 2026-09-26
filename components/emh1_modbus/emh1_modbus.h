#pragma once

#include "esphome/core/component.h"
#include "esphome/components/uart/uart.h"

namespace esphome {
namespace emh1_modbus {

static const uint8_t FUNCTION_READ = 0x03;
static const uint8_t FUNCTION_WRITE = 0x10;

static const uint16_t REG_READ_CHARGING_ALLOWED = 0x000F;
static const uint16_t REG_MODIFY_STATE = 0x0005;
static const uint16_t REG_SET_I_CMAX = 0x0014;
static const uint16_t REG_READ_CURRENT_FULL = 0x002E;
static const uint16_t REG_READ_SERIAL_NUMBER = 0x0050;

static const uint16_t NO_CURRENT_ALLOWED = 0x03E8;

struct eMH1MessageT {
  uint8_t DeviceId;
  uint8_t FunctionCode;
  uint16_t Destination;
  uint16_t DataLength;
  uint8_t LRC;
  uint8_t WriteBytes;
  uint8_t Data[100];
};

class eMH1ModbusDevice;

class eMH1Modbus : public uart::UARTDevice, public Component {
public:
  eMH1Modbus() = default;

  void setup() override;
  void loop() override;

  void dump_config() override;

  void register_device(eMH1ModbusDevice *device) { this->devices_.push_back(device); }
  void set_flow_control_pin(GPIOPin *flow_control_pin) { this->flow_control_pin_ = flow_control_pin; }

  float get_setup_priority() const override;

  void send();
  void send_current(float x);
  // Last current (in Amps) sent via send_current(), so it can be restored
  // after the charger reconnects following a power-cycle/reset. Lives in
  // RAM only - lost on an ESP reboot, not on a charger-only reset.
  float get_last_current() const { return last_current_; }
  void send_enable(uint8_t x);
  void query_status_report();
  void get_serial();
  void get_charging_allowed();
  void send_charging_disable();
  void send_duty_cycle(uint16_t duty_cycle);
  char hexencode_single(uint8_t val);
  uint8_t hexencode_ascii(uint8_t val, char *outStr, uint8_t offset);
  uint8_t hexencode_ascii(uint16_t val, char *outStr, uint8_t offset);
  uint8_t hexencode_ascii(uint8_t *val, char *outStr, uint8_t offset, uint8_t cnt);

protected:
  bool parse_emh1_modbus_byte_(uint8_t byte);
  GPIOPin *flow_control_pin_{nullptr};

  eMH1MessageT emh1_tx_message;
  std::vector<char> rx_buffer_;
  uint32_t last_emh1_modbus_byte_{0};
  std::vector<eMH1ModbusDevice *> devices_;
  float last_current_{NAN};
};

class eMH1ModbusDevice {
public:
  void set_parent(eMH1Modbus *parent) { parent_ = parent; }
  void set_address(uint8_t address) { address_ = address; }
  virtual void on_emh1_modbus_data(uint16_t function, uint16_t datalength, const uint8_t *data) = 0;

  void query_status_report() { this->parent_->query_status_report(); }
  void get_serial() { this->parent_->get_serial(); }
  void get_charging_allowed() { this->parent_->get_charging_allowed(); }

protected:
  friend eMH1Modbus;

  eMH1Modbus *parent_;
  uint8_t address_;
};

} // namespace emh1_modbus
} // namespace esphome
