-- phpMyAdmin SQL Dump
-- version 5.2.2
-- https://www.phpmyadmin.net/
--
-- Host: 127.0.0.1:3306
-- Generation Time: Mar 19, 2026 at 10:34 AM
-- Server version: 11.8.3-MariaDB-log
-- PHP Version: 7.2.34

SET SQL_MODE = "NO_AUTO_VALUE_ON_ZERO";
START TRANSACTION;
SET time_zone = "+00:00";


/*!40101 SET @OLD_CHARACTER_SET_CLIENT=@@CHARACTER_SET_CLIENT */;
/*!40101 SET @OLD_CHARACTER_SET_RESULTS=@@CHARACTER_SET_RESULTS */;
/*!40101 SET @OLD_COLLATION_CONNECTION=@@COLLATION_CONNECTION */;
/*!40101 SET NAMES utf8mb4 */;

--
-- Database: `u397706344_broai`
--

-- --------------------------------------------------------

--
-- Table structure for table `chats`
--

CREATE TABLE `chats` (
  `id` varchar(50) NOT NULL,
  `user_id` varchar(100) DEFAULT NULL,
  `title` varchar(255) DEFAULT 'New Chat',
  `model` varchar(50) DEFAULT 'gpt-4o-mini',
  `created_at` timestamp NULL DEFAULT current_timestamp(),
  `updated_at` timestamp NULL DEFAULT current_timestamp() ON UPDATE current_timestamp()
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- --------------------------------------------------------

--
-- Table structure for table `festival_notifications`
--

CREATE TABLE `festival_notifications` (
  `id` int(11) NOT NULL,
  `festival_date` varchar(10) DEFAULT NULL,
  `session_time` datetime DEFAULT NULL,
  `festival_name_english` varchar(255) DEFAULT NULL,
  `festival_name_hindi` varchar(255) DEFAULT NULL,
  `festival_type` varchar(100) DEFAULT NULL,
  `notification_sent` tinyint(1) DEFAULT 0,
  `sent_at` datetime DEFAULT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- --------------------------------------------------------

--
-- Table structure for table `image_chats`
--

CREATE TABLE `image_chats` (
  `id` int(11) NOT NULL,
  `chat_id` varchar(255) NOT NULL,
  `user_id` varchar(255) NOT NULL,
  `prompt` text NOT NULL,
  `image_url` text NOT NULL,
  `model` varchar(255) NOT NULL,
  `upscaled` tinyint(1) DEFAULT 0,
  `upscaled_url` text DEFAULT NULL,
  `created_at` timestamp NULL DEFAULT current_timestamp(),
  `updated_at` timestamp NULL DEFAULT current_timestamp() ON UPDATE current_timestamp()
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- --------------------------------------------------------

--
-- Table structure for table `image_reports`
--

CREATE TABLE `image_reports` (
  `id` bigint(20) NOT NULL,
  `report_id` char(16) NOT NULL,
  `user_id` varchar(255) NOT NULL,
  `chat_id` varchar(255) NOT NULL,
  `prompt` text DEFAULT NULL,
  `image_url` text DEFAULT NULL,
  `task_uuid` varchar(255) DEFAULT NULL,
  `reported` tinyint(4) DEFAULT 0,
  `report_reason` varchar(255) DEFAULT NULL,
  `report_details` text DEFAULT NULL,
  `created_at` datetime DEFAULT current_timestamp(),
  `reported_at` datetime DEFAULT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- --------------------------------------------------------

--
-- Table structure for table `messages`
--

CREATE TABLE `messages` (
  `id` int(11) NOT NULL,
  `chat_id` varchar(50) DEFAULT NULL,
  `role` enum('user','assistant','system') NOT NULL,
  `content` longtext NOT NULL,
  `tokens_used` int(11) DEFAULT 0,
  `model` varchar(50) DEFAULT NULL,
  `is_booster` tinyint(1) NOT NULL DEFAULT 0,
  `report_id` varchar(36) DEFAULT NULL,
  `is_reported` tinyint(1) NOT NULL DEFAULT 0,
  `created_at` timestamp NULL DEFAULT current_timestamp()
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- --------------------------------------------------------

--
-- Table structure for table `reports`
--

CREATE TABLE `reports` (
  `id` int(11) NOT NULL,
  `user_id` int(11) NOT NULL,
  `category` varchar(100) NOT NULL,
  `reason` longtext NOT NULL,
  `content` text DEFAULT NULL,
  `content_type` varchar(50) DEFAULT NULL,
  `status` varchar(50) DEFAULT 'pending',
  `created_at` timestamp NULL DEFAULT current_timestamp(),
  `report_id` varchar(255) NOT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- --------------------------------------------------------

--
-- Table structure for table `users`
--

CREATE TABLE `users` (
  `uid` varchar(100) NOT NULL,
  `email` varchar(100) DEFAULT NULL,
  `displayName` varchar(100) DEFAULT NULL,
  `photoURL` text DEFAULT NULL,
  `emailVerified` tinyint(1) DEFAULT 0,
  `tokens` int(11) DEFAULT 2000,
  `lastLoginAt` timestamp NULL DEFAULT NULL,
  `created_at` timestamp NULL DEFAULT current_timestamp(),
  `updated_at` timestamp NULL DEFAULT current_timestamp() ON UPDATE current_timestamp(),
  `phoneNumber` varchar(15) DEFAULT NULL,
  `telegram_claimed` tinyint(1) DEFAULT 0,
  `telegram_username` varchar(255) DEFAULT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- --------------------------------------------------------

--
-- Table structure for table `user_fcm_tokens`
--

CREATE TABLE `user_fcm_tokens` (
  `id` int(11) NOT NULL,
  `user_id` varchar(255) NOT NULL,
  `fcm_token` text NOT NULL,
  `notifications_allowed` tinyint(1) DEFAULT 1,
  `last_active` timestamp NULL DEFAULT NULL,
  `created_at` timestamp NULL DEFAULT current_timestamp(),
  `updated_at` timestamp NULL DEFAULT current_timestamp() ON UPDATE current_timestamp()
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- --------------------------------------------------------

--
-- Table structure for table `user_notification_log`
--

CREATE TABLE `user_notification_log` (
  `id` int(11) NOT NULL,
  `user_id` varchar(255) NOT NULL,
  `festival_date` varchar(10) NOT NULL,
  `session_time` datetime NOT NULL,
  `festival_name_english` varchar(255) DEFAULT NULL,
  `festival_name_hindi` varchar(255) DEFAULT NULL,
  `festival_type` varchar(100) DEFAULT NULL,
  `sent_at` datetime NOT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- --------------------------------------------------------

--
-- Table structure for table `user_notification_tracking`
--

CREATE TABLE `user_notification_tracking` (
  `id` int(11) NOT NULL,
  `user_id` varchar(255) DEFAULT NULL,
  `festival_date` varchar(10) DEFAULT NULL,
  `session_time` datetime DEFAULT NULL,
  `notification_sent_at` datetime DEFAULT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- --------------------------------------------------------

--
-- Table structure for table `user_responses`
--

CREATE TABLE `user_responses` (
  `id` int(11) NOT NULL,
  `user_id` varchar(255) NOT NULL,
  `chat_id` varchar(255) NOT NULL,
  `report_id` char(16) DEFAULT NULL,
  `message_type` enum('user','assistant') NOT NULL,
  `content` text NOT NULL,
  `message_data` longtext CHARACTER SET utf8mb4 COLLATE utf8mb4_bin DEFAULT NULL CHECK (json_valid(`message_data`)),
  `created_at` timestamp NULL DEFAULT current_timestamp()
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

--
-- Indexes for dumped tables
--

--
-- Indexes for table `chats`
--
ALTER TABLE `chats`
  ADD PRIMARY KEY (`id`),
  ADD KEY `user_id` (`user_id`);

--
-- Indexes for table `festival_notifications`
--
ALTER TABLE `festival_notifications`
  ADD PRIMARY KEY (`id`);

--
-- Indexes for table `image_chats`
--
ALTER TABLE `image_chats`
  ADD PRIMARY KEY (`id`),
  ADD KEY `idx_chat_id` (`chat_id`),
  ADD KEY `idx_user_id` (`user_id`),
  ADD KEY `idx_created_at` (`created_at`);

--
-- Indexes for table `image_reports`
--
ALTER TABLE `image_reports`
  ADD PRIMARY KEY (`id`),
  ADD UNIQUE KEY `report_id` (`report_id`),
  ADD KEY `user_id` (`user_id`),
  ADD KEY `report_id_2` (`report_id`),
  ADD KEY `chat_id` (`chat_id`);

--
-- Indexes for table `messages`
--
ALTER TABLE `messages`
  ADD PRIMARY KEY (`id`),
  ADD KEY `idx_chat_created` (`chat_id`,`created_at`),
  ADD KEY `idx_report_id` (`report_id`),
  ADD KEY `idx_is_reported` (`is_reported`);

--
-- Indexes for table `reports`
--
ALTER TABLE `reports`
  ADD PRIMARY KEY (`id`),
  ADD UNIQUE KEY `unique_report` (`report_id`);

--
-- Indexes for table `users`
--
ALTER TABLE `users`
  ADD PRIMARY KEY (`uid`),
  ADD UNIQUE KEY `email` (`email`);

--
-- Indexes for table `user_fcm_tokens`
--
ALTER TABLE `user_fcm_tokens`
  ADD PRIMARY KEY (`id`),
  ADD UNIQUE KEY `unique_user` (`user_id`),
  ADD KEY `idx_last_active` (`last_active`),
  ADD KEY `idx_notifications` (`notifications_allowed`);

--
-- Indexes for table `user_notification_log`
--
ALTER TABLE `user_notification_log`
  ADD PRIMARY KEY (`id`),
  ADD UNIQUE KEY `unique_notification` (`user_id`,`festival_date`,`session_time`);

--
-- Indexes for table `user_notification_tracking`
--
ALTER TABLE `user_notification_tracking`
  ADD PRIMARY KEY (`id`),
  ADD UNIQUE KEY `unique_user_festival_session` (`user_id`,`festival_date`,`session_time`);

--
-- Indexes for table `user_responses`
--
ALTER TABLE `user_responses`
  ADD PRIMARY KEY (`id`),
  ADD KEY `idx_user_id` (`user_id`),
  ADD KEY `idx_chat_id` (`chat_id`),
  ADD KEY `idx_created_at` (`created_at`),
  ADD KEY `idx_report_id` (`report_id`);

--
-- AUTO_INCREMENT for dumped tables
--

--
-- AUTO_INCREMENT for table `festival_notifications`
--
ALTER TABLE `festival_notifications`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT;

--
-- AUTO_INCREMENT for table `image_chats`
--
ALTER TABLE `image_chats`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT;

--
-- AUTO_INCREMENT for table `image_reports`
--
ALTER TABLE `image_reports`
  MODIFY `id` bigint(20) NOT NULL AUTO_INCREMENT;

--
-- AUTO_INCREMENT for table `messages`
--
ALTER TABLE `messages`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT;

--
-- AUTO_INCREMENT for table `reports`
--
ALTER TABLE `reports`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT;

--
-- AUTO_INCREMENT for table `user_fcm_tokens`
--
ALTER TABLE `user_fcm_tokens`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT;

--
-- AUTO_INCREMENT for table `user_notification_log`
--
ALTER TABLE `user_notification_log`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT;

--
-- AUTO_INCREMENT for table `user_notification_tracking`
--
ALTER TABLE `user_notification_tracking`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT;

--
-- AUTO_INCREMENT for table `user_responses`
--
ALTER TABLE `user_responses`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT;

--
-- Constraints for dumped tables
--

--
-- Constraints for table `chats`
--
ALTER TABLE `chats`
  ADD CONSTRAINT `chats_ibfk_1` FOREIGN KEY (`user_id`) REFERENCES `users` (`uid`) ON DELETE CASCADE;

--
-- Constraints for table `image_chats`
--
ALTER TABLE `image_chats`
  ADD CONSTRAINT `image_chats_ibfk_1` FOREIGN KEY (`user_id`) REFERENCES `users` (`uid`) ON DELETE CASCADE;

--
-- Constraints for table `messages`
--
ALTER TABLE `messages`
  ADD CONSTRAINT `messages_ibfk_1` FOREIGN KEY (`chat_id`) REFERENCES `chats` (`id`) ON DELETE CASCADE;

--
-- Constraints for table `user_responses`
--
ALTER TABLE `user_responses`
  ADD CONSTRAINT `fk_user_responses_report_id` FOREIGN KEY (`report_id`) REFERENCES `image_reports` (`report_id`) ON DELETE SET NULL,
  ADD CONSTRAINT `user_responses_ibfk_1` FOREIGN KEY (`user_id`) REFERENCES `users` (`uid`) ON DELETE CASCADE;
COMMIT;

/*!40101 SET CHARACTER_SET_CLIENT=@OLD_CHARACTER_SET_CLIENT */;
/*!40101 SET CHARACTER_SET_RESULTS=@OLD_CHARACTER_SET_RESULTS */;
/*!40101 SET COLLATION_CONNECTION=@OLD_COLLATION_CONNECTION */;
