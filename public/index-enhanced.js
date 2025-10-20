// NAK Chess - Enhanced Features
// This file contains all the enhanced functionality for the index page

(function() {
  'use strict';

  // ============================================
  // Utility Functions
  // ============================================

  // Debounce function for performance optimization
  function debounce(func, wait) {
    let timeout;
    return function executedFunction(...args) {
      const later = () => {
        clearTimeout(timeout);
        func(...args);
      };
      clearTimeout(timeout);
      timeout = setTimeout(later, wait);
    };
  }

  // Throttle function for scroll events
  function throttle(func, limit) {
    let inThrottle;
    return function(...args) {
      if (!inThrottle) {
        func.apply(this, args);
        inThrottle = true;
        setTimeout(() => inThrottle = false, limit);
      }
    };
  }

  // ============================================
  // Dark Mode Toggle
  // ============================================

  function initDarkMode() {
    const darkModeToggle = document.getElementById('dark-mode-toggle');
    const body = document.body;
    const darkModeIcon = darkModeToggle.querySelector('i');

    // Check for saved dark mode preference
    const savedDarkMode = localStorage.getItem('darkMode');
    if (savedDarkMode === 'enabled') {
      body.classList.add('dark-mode');
      darkModeIcon.classList.remove('fa-moon');
      darkModeIcon.classList.add('fa-sun');
    }

    darkModeToggle.addEventListener('click', () => {
      body.classList.toggle('dark-mode');

      if (body.classList.contains('dark-mode')) {
        darkModeIcon.classList.remove('fa-moon');
        darkModeIcon.classList.add('fa-sun');
        localStorage.setItem('darkMode', 'enabled');
      } else {
        darkModeIcon.classList.remove('fa-sun');
        darkModeIcon.classList.add('fa-moon');
        localStorage.setItem('darkMode', 'disabled');
      }
    });
  }

  // ============================================
  // Notification System
  // ============================================

  function initNotifications() {
    const notificationBtn = document.getElementById('notifications-btn');
    const notificationDropdown = document.getElementById('notification-dropdown');
    const notificationBadge = document.getElementById('notification-badge');
    const clearNotificationsBtn = document.getElementById('clear-notifications');

    let notifications = JSON.parse(localStorage.getItem('notifications') || '[]');

    function updateNotificationBadge() {
      if (notifications.length > 0) {
        notificationBadge.textContent = notifications.length;
        notificationBadge.style.display = 'block';
      } else {
        notificationBadge.style.display = 'none';
      }
    }

    function renderNotifications() {
      const notificationList = document.getElementById('notification-list');

      if (notifications.length === 0) {
        notificationList.innerHTML = '<p class="no-notifications">새로운 알림이 없습니다</p>';
      } else {
        notificationList.innerHTML = notifications.map((notif, index) => `
          <div class="notification-item" data-index="${index}">
            <i class="fas ${notif.icon}"></i>
            <div class="notification-content">
              <p>${notif.message}</p>
              <small>${notif.time}</small>
            </div>
            <button class="notification-delete" data-index="${index}">
              <i class="fas fa-times"></i>
            </button>
          </div>
        `).join('');

        // Add delete event listeners
        notificationList.querySelectorAll('.notification-delete').forEach(btn => {
          btn.addEventListener('click', (e) => {
            e.stopPropagation();
            const index = parseInt(btn.dataset.index);
            notifications.splice(index, 1);
            localStorage.setItem('notifications', JSON.stringify(notifications));
            renderNotifications();
            updateNotificationBadge();
          });
        });
      }
    }

    // Toggle notification dropdown
    notificationBtn.addEventListener('click', (e) => {
      e.stopPropagation();
      notificationDropdown.style.display =
        notificationDropdown.style.display === 'none' ? 'block' : 'none';
      renderNotifications();
    });

    // Clear all notifications
    clearNotificationsBtn.addEventListener('click', () => {
      notifications = [];
      localStorage.setItem('notifications', JSON.stringify(notifications));
      renderNotifications();
      updateNotificationBadge();
    });

    // Close dropdown when clicking outside
    document.addEventListener('click', (e) => {
      if (!notificationDropdown.contains(e.target) &&
          e.target !== notificationBtn &&
          !notificationBtn.contains(e.target)) {
        notificationDropdown.style.display = 'none';
      }
    });

    updateNotificationBadge();
  }

  // ============================================
  // Live Stats Loading
  // ============================================

  function initLiveStats() {
    const onlinePlayersEl = document.getElementById('online-players');
    const activeGamesEl = document.getElementById('active-games');
    const totalGamesEl = document.getElementById('total-games');

    // Simulate fetching live stats (replace with actual API call)
    function fetchLiveStats() {
      // This would be an actual API call in production
      return new Promise((resolve) => {
        setTimeout(() => {
          resolve({
            onlinePlayers: Math.floor(Math.random() * 200) + 50,
            activeGames: Math.floor(Math.random() * 50) + 10,
            totalGames: 50000 + Math.floor(Math.random() * 1000)
          });
        }, 500);
      });
    }

    async function updateStats() {
      try {
        const stats = await fetchLiveStats();
        onlinePlayersEl.textContent = stats.onlinePlayers;
        activeGamesEl.textContent = stats.activeGames;
        totalGamesEl.textContent = stats.totalGames.toLocaleString();
      } catch (error) {
        onlinePlayersEl.textContent = '-';
        activeGamesEl.textContent = '-';
        totalGamesEl.textContent = '-';
      }
    }

    updateStats();
    // Update stats every 30 seconds
    setInterval(updateStats, 30000);
  }

  // ============================================
  // Animated Counter for Stats Showcase
  // ============================================

  function initStatsCounter() {
    const statNumbers = document.querySelectorAll('.stat-number');
    let hasAnimated = false;

    function animateCounter(element) {
      const target = parseInt(element.dataset.count);
      const duration = 2000; // 2 seconds
      const step = target / (duration / 16); // 60fps
      let current = 0;

      const timer = setInterval(() => {
        current += step;
        if (current >= target) {
          element.textContent = target.toLocaleString();
          clearInterval(timer);
        } else {
          element.textContent = Math.floor(current).toLocaleString();
        }
      }, 16);
    }

    const observer = new IntersectionObserver((entries) => {
      entries.forEach(entry => {
        if (entry.isIntersecting && !hasAnimated) {
          hasAnimated = true;
          statNumbers.forEach(stat => {
            animateCounter(stat);
          });
        }
      });
    }, { threshold: 0.5 });

    const statsSection = document.getElementById('stats-showcase');
    if (statsSection) {
      observer.observe(statsSection);
    }
  }

  // ============================================
  // FAQ Accordion
  // ============================================

  function initFAQ() {
    const faqQuestions = document.querySelectorAll('.faq-question');

    faqQuestions.forEach(question => {
      question.addEventListener('click', () => {
        const faqItem = question.parentElement;
        const answer = faqItem.querySelector('.faq-answer');
        const icon = question.querySelector('i');
        const isOpen = question.getAttribute('aria-expanded') === 'true';

        // Close all other FAQs
        faqQuestions.forEach(q => {
          if (q !== question) {
            q.setAttribute('aria-expanded', 'false');
            q.parentElement.classList.remove('active');
            q.querySelector('i').classList.remove('fa-chevron-up');
            q.querySelector('i').classList.add('fa-chevron-down');
          }
        });

        // Toggle current FAQ
        if (isOpen) {
          question.setAttribute('aria-expanded', 'false');
          faqItem.classList.remove('active');
          icon.classList.remove('fa-chevron-up');
          icon.classList.add('fa-chevron-down');
        } else {
          question.setAttribute('aria-expanded', 'true');
          faqItem.classList.add('active');
          icon.classList.remove('fa-chevron-down');
          icon.classList.add('fa-chevron-up');
        }
      });

      // Keyboard accessibility
      question.addEventListener('keydown', (e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault();
          question.click();
        }
      });
    });
  }

  // ============================================
  // Leaderboard Tabs
  // ============================================

  function initLeaderboard() {
    const tabButtons = document.querySelectorAll('.tab-btn');
    const leaderboardBody = document.getElementById('leaderboard-body');

    // Sample leaderboard data (replace with actual API call)
    const leaderboardData = {
      daily: [
        { rank: 1, name: '킹마스터', rating: 2250, wins: 15, losses: 2, winRate: 88 },
        { rank: 2, name: '체스천재', rating: 2180, wins: 12, losses: 3, winRate: 80 },
        { rank: 3, name: '퀸슬레이어', rating: 2150, wins: 10, losses: 2, winRate: 83 },
        { rank: 4, name: '나이트런너', rating: 2100, wins: 14, losses: 5, winRate: 74 },
        { rank: 5, name: '룩마스터', rating: 2050, wins: 11, losses: 4, winRate: 73 },
      ],
      weekly: [
        { rank: 1, name: '그랜드마스터', rating: 2350, wins: 45, losses: 8, winRate: 85 },
        { rank: 2, name: '체스황제', rating: 2280, wins: 38, losses: 10, winRate: 79 },
        { rank: 3, name: '전략가', rating: 2220, wins: 35, losses: 12, winRate: 74 },
        { rank: 4, name: '비숍킹', rating: 2180, wins: 32, losses: 11, winRate: 74 },
        { rank: 5, name: '폰프로', rating: 2150, wins: 30, losses: 10, winRate: 75 },
      ],
      'all-time': [
        { rank: 1, name: '레전드', rating: 2500, wins: 500, losses: 50, winRate: 91 },
        { rank: 2, name: '체스신', rating: 2450, wins: 450, losses: 60, winRate: 88 },
        { rank: 3, name: '무적킹', rating: 2400, wins: 400, losses: 55, winRate: 88 },
        { rank: 4, name: '마스터프로', rating: 2350, wins: 380, losses: 70, winRate: 84 },
        { rank: 5, name: '챔피언', rating: 2300, wins: 350, losses: 65, winRate: 84 },
      ]
    };

    function renderLeaderboard(tab) {
      const data = leaderboardData[tab];
      leaderboardBody.innerHTML = data.map(player => `
        <tr>
          <td class="rank-${player.rank}">${player.rank}</td>
          <td>${player.name}</td>
          <td>${player.rating}</td>
          <td>${player.wins}/${player.losses}</td>
          <td>${player.winRate}%</td>
        </tr>
      `).join('');
    }

    tabButtons.forEach(btn => {
      btn.addEventListener('click', () => {
        // Remove active class from all buttons
        tabButtons.forEach(b => b.classList.remove('active'));

        // Add active class to clicked button
        btn.classList.add('active');

        // Render leaderboard for selected tab
        const tab = btn.dataset.tab;
        renderLeaderboard(tab);
      });
    });

    // Load initial leaderboard
    renderLeaderboard('daily');
  }

  // ============================================
  // Newsletter Form
  // ============================================

  function initNewsletter() {
    const newsletterForm = document.getElementById('newsletter-form');

    newsletterForm.addEventListener('submit', async (e) => {
      e.preventDefault();

      const emailInput = newsletterForm.querySelector('input[type="email"]');
      const submitBtn = newsletterForm.querySelector('button[type="submit"]');
      const email = emailInput.value;

      // Disable button during submission
      submitBtn.disabled = true;
      submitBtn.textContent = '구독 중...';

      try {
        // Simulate API call (replace with actual API endpoint)
        await new Promise(resolve => setTimeout(resolve, 1000));

        // Success
        alert('뉴스레터 구독이 완료되었습니다!');
        emailInput.value = '';

        // Add to localStorage for demo
        const subscribers = JSON.parse(localStorage.getItem('subscribers') || '[]');
        subscribers.push(email);
        localStorage.setItem('subscribers', JSON.stringify(subscribers));

      } catch (error) {
        alert('구독 중 오류가 발생했습니다. 다시 시도해주세요.');
      } finally {
        submitBtn.disabled = false;
        submitBtn.textContent = '구독';
      }
    });
  }

  // ============================================
  // Dynamic Copyright Year
  // ============================================

  function initCopyrightYear() {
    const yearElement = document.getElementById('current-year');
    if (yearElement) {
      yearElement.textContent = new Date().getFullYear();
    }
  }

  // ============================================
  // Enhanced Scroll Animations
  // ============================================

  function initScrollAnimations() {
    const header = document.getElementById('header');

    // Optimized scroll handler with throttle
    const handleScroll = throttle(() => {
      if (window.scrollY > 50) {
        header.classList.add('scrolled');
      } else {
        header.classList.remove('scrolled');
      }
    }, 100);

    window.addEventListener('scroll', handleScroll);
  }

  // ============================================
  // Keyboard Navigation Enhancement
  // ============================================

  function initKeyboardNavigation() {
    // Add focus visible class for keyboard navigation
    document.addEventListener('keydown', (e) => {
      if (e.key === 'Tab') {
        document.body.classList.add('keyboard-nav');
      }
    });

    document.addEventListener('mousedown', () => {
      document.body.classList.remove('keyboard-nav');
    });

    // Skip to main content link
    const skipLink = document.querySelector('.skip-to-content');
    if (skipLink) {
      skipLink.addEventListener('click', (e) => {
        e.preventDefault();
        const mainContent = document.getElementById('main-content');
        if (mainContent) {
          mainContent.setAttribute('tabindex', '-1');
          mainContent.focus();
          mainContent.removeAttribute('tabindex');
        }
      });
    }
  }

  // ============================================
  // Lazy Loading Images
  // ============================================

  function initLazyLoading() {
    const images = document.querySelectorAll('img[loading="lazy"]');

    if ('IntersectionObserver' in window) {
      const imageObserver = new IntersectionObserver((entries, observer) => {
        entries.forEach(entry => {
          if (entry.isIntersecting) {
            const img = entry.target;
            img.src = img.dataset.src || img.src;
            img.classList.add('loaded');
            observer.unobserve(img);
          }
        });
      });

      images.forEach(img => imageObserver.observe(img));
    }
  }

  // ============================================
  // Error Handling
  // ============================================

  window.addEventListener('error', (e) => {
    console.error('Global error:', e.error);
    // You could send this to an error tracking service
  });

  window.addEventListener('unhandledrejection', (e) => {
    console.error('Unhandled promise rejection:', e.reason);
    // You could send this to an error tracking service
  });

  // ============================================
  // Initialization
  // ============================================

  document.addEventListener('DOMContentLoaded', () => {
    try {
      initDarkMode();
      initNotifications();
      initLiveStats();
      initStatsCounter();
      initFAQ();
      initLeaderboard();
      initNewsletter();
      initCopyrightYear();
      initScrollAnimations();
      initKeyboardNavigation();
      initLazyLoading();

      console.log('✓ NAK Chess enhanced features initialized successfully');
    } catch (error) {
      console.error('Error initializing enhanced features:', error);
    }
  });

  // ============================================
  // Performance Monitoring
  // ============================================

  if (window.performance && window.performance.timing) {
    window.addEventListener('load', () => {
      setTimeout(() => {
        const perfData = window.performance.timing;
        const pageLoadTime = perfData.loadEventEnd - perfData.navigationStart;
        console.log(`Page loaded in ${pageLoadTime}ms`);
      }, 0);
    });
  }

})();
