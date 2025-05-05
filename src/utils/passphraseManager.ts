/* eslint-disable prettier/prettier */
/**
 * PassphraseManager - Quản lý master passphrase trong phiên làm việc
 * 
 * Lớp này lưu trữ master passphrase tạm thời trong bộ nhớ để tránh phải
 * yêu cầu người dùng nhập lại nhiều lần trong một phiên làm việc ngắn.
 * Passphrase sẽ tự động hết hạn sau một khoảng thời gian cố định.
 */

class PassphraseManager {
  private passphrase: string | null = null;
  private expiryTime: number | null = null;
  private readonly DEFAULT_TTL = 5 * 60 * 1000; // 5 phút mặc định

  /**
   * Lưu master passphrase vào bộ nhớ tạm
   * @param passphrase - Master passphrase cần lưu
   * @param ttl - Thời gian tồn tại (miliseconds), mặc định 5 phút
   */
  setPassphrase(passphrase: string, ttl: number = this.DEFAULT_TTL): void {
    this.passphrase = passphrase;
    this.expiryTime = Date.now() + ttl;
    
    // Tự động xóa passphrase sau khi hết hạn
    setTimeout(() => {
      this.clearPassphrase();
    }, ttl);
  }

  /**
   * Lấy master passphrase đã lưu nếu còn hạn
   * @returns Master passphrase hoặc null nếu không tìm thấy hoặc đã hết hạn
   */
  getPassphrase(): string | null {
    if (!this.passphrase || !this.expiryTime) {
      return null;
    }

    // Kiểm tra xem passphrase có còn hạn không
    if (Date.now() > this.expiryTime) {
      this.clearPassphrase();
      return null;
    }

    return this.passphrase;
  }

  /**
   * Kiểm tra xem có master passphrase hợp lệ không
   * @returns true nếu có passphrase và còn hạn sử dụng
   */
  hasValidPassphrase(): boolean {
    return Boolean(this.getPassphrase());
  }

  /**
   * Xóa master passphrase
   */
  clearPassphrase(): void {
    this.passphrase = null;
    this.expiryTime = null;
  }

  /**
   * Gia hạn thời gian tồn tại của passphrase
   * @param ttl - Thời gian tồn tại mới (miliseconds)
   * @returns true nếu gia hạn thành công, false nếu không có passphrase để gia hạn
   */
  extendValidity(ttl: number = this.DEFAULT_TTL): boolean {
    if (!this.passphrase) {
      return false;
    }

    this.expiryTime = Date.now() + ttl;
    return true;
  }

  /**
   * Trả về thời gian còn lại (ms) của passphrase
   * @returns Thời gian còn lại hoặc 0 nếu đã hết hạn
   */
  getRemainingTime(): number {
    if (!this.expiryTime) return 0;
    
    const remaining = this.expiryTime - Date.now();
    return remaining > 0 ? remaining : 0;
  }
}

// Tạo một instance duy nhất để sử dụng trong toàn ứng dụng
const passphraseManager = new PassphraseManager();

export default passphraseManager;