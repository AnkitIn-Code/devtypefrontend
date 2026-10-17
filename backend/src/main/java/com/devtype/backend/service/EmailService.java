package com.devtype.backend.service;

public interface EmailService {
    /**
     * Dispatches a transactional password reset email to the specified recipient.
     *
     * @param toEmail destination email address
     * @param resetToken unhashed raw reset token UUID
     */
    void sendPasswordResetEmail(String toEmail, String resetToken);
}
