const fs = require('fs');
const path = require('path');

const endpointsPath = path.join(__dirname, '..', 'endpoints_list.json');
const outputPath = path.join(__dirname, '..', '..', 'golidoli_postman_collection.json');

let rawEndpoints = [];
if (fs.existsSync(endpointsPath)) {
  rawEndpoints = JSON.parse(fs.readFileSync(endpointsPath, 'utf8'));
}

// Extra endpoints including Comments and new modules
const extraEndpoints = [
  // Comments (Clean 4 Core APIs)
  {
    file: "user/comment.routes.js",
    method: "GET",
    endpoint: "/api/comments/:contentId"
  },
  {
    file: "user/comment.routes.js",
    method: "POST",
    endpoint: "/api/comments/:contentId"
  },
  {
    file: "user/comment.routes.js",
    method: "PATCH",
    endpoint: "/api/comments/:id"
  },
  {
    file: "user/comment.routes.js",
    method: "DELETE",
    endpoint: "/api/comments/:id"
  },


  // Interaction
  {
    file: "user/interation.routes.js",
    method: "POST",
    endpoint: "/api/interaction/toggle/like/:contentId"
  },
  {
    file: "user/interation.routes.js",
    method: "POST",
    endpoint: "/api/interaction/toggle/dislike/:contentId"
  },
  {
    file: "user/interation.routes.js",
    method: "POST",
    endpoint: "/api/interaction/toggle/follow/:userId"
  },
  {
    file: "user/interation.routes.js",
    method: "GET",
    endpoint: "/api/interaction/follow/:userId"
  },
  {
    file: "user/interation.routes.js",
    method: "POST",
    endpoint: "/api/interaction/toggle/bookmark/:contentId"
  },
  {
    file: "user/interation.routes.js",
    method: "GET",
    endpoint: "/api/interaction/bookmarks"
  },
  // AI Reels
  {
    file: "user/aiReel.routes.js",
    method: "GET",
    endpoint: "/api/ai-reels"
  },
  {
    file: "admin/aiReel.routes.js",
    method: "POST",
    endpoint: "/api/admin/ai-reels"
  },
  // Audio Stories
  {
    file: "user/audioStory.routes.js",
    method: "GET",
    endpoint: "/api/audio-stories"
  },
  {
    file: "user/audioEpisode.routes.js",
    method: "GET",
    endpoint: "/api/audio-episodes/:storyId"
  },
  {
    file: "user/audioProgress.routes.js",
    method: "POST",
    endpoint: "/api/audio-progress"
  }
];

const allEndpoints = [...rawEndpoints];

extraEndpoints.forEach(extra => {
  if (!allEndpoints.some(e => e.method === extra.method && e.endpoint === extra.endpoint)) {
    allEndpoints.push(extra);
  }
});

// Format folder names based on file property
function getFolderName(file) {
  const mapping = {
    'admin/auth.routes.js': 'Admin Authentication',
    'admin/user.routes.js': 'Admin User Management',
    'admin/movie.routes.js': 'Admin Movies',
    'admin/series.routes.js': 'Admin Web Series',
    'admin/episode.routes.js': 'Admin Series Episodes',
    'admin/content.routes.js': 'Admin Content Overview',
    'admin/microdrama.routes.js': 'Admin Microdramas',
    'admin/microdramasEpisode.routes.js': 'Admin Microdrama Episodes',
    'admin/shortdrama.routes.js': 'Admin Short Dramas',
    'admin/dramaEpisode.routes.js': 'Admin Drama Episodes',
    'admin/legal.routes.js': 'Admin Legal Pages',
    'admin/help.routes.js': 'Admin Help & Support FAQs',
    'admin/promo.routes.js': 'Admin Promo Codes',
    'admin/voucher.routes.js': 'Admin Vouchers',
    'admin/subscription.routes.js': 'Admin Subscriptions',
    'admin/notification.routes.js': 'Admin Push Notifications',
    'admin/support.routes.js': 'Admin Support Tickets',
    'admin/plan.routes.js': 'Admin Subscription Plans',
    'admin/aiReel.routes.js': 'Admin AI Reels',
    'admin/audioCategory.routes.js': 'Admin Audio Categories',
    'admin/audioStory.routes.js': 'Admin Audio Stories',
    'admin/audioEpisode.routes.js': 'Admin Audio Episodes',
    'user/auth.routes.js': 'User Authentication',
    'user/user.routes.js': 'User Profile & Settings',
    'user/movie.routes.js': 'User Movies',
    'user/series.routes.js': 'User Web Series',
    'user/content.routes.js': 'User Content Catalog',
    'user/legal.routes.js': 'User Legal & Terms',
    'user/help.routes.js': 'User Help Center',
    'user/rating.routes.js': 'User Ratings & Reviews',
    'user/comment.routes.js': 'User Comments',
    'user/plan.routes.js': 'User Subscription Plans',
    'user/promo.routes.js': 'User Promo Coupons',
    'user/voucher.routes.js': 'User Vouchers',
    'user/subscription.routes.js': 'User Subscriptions & Payments',
    'user/watchlist.routes.js': 'User Watchlist',
    'user/notification.routes.js': 'User Notifications',
    'user/interation.routes.js': 'User Interactions (Like / Follow)',
    'user/support.routes.js': 'User Support Tickets',
    'user/reel.routes.js': 'User Reels',
    'user/aiReel.routes.js': 'User AI Reels',
    'user/microdrama.routes.js': 'User Microdramas',
    'user/microdramasEpisode.routes.js': 'User Microdrama Episodes',
    'user/audioStory.routes.js': 'User Audio Stories',
    'user/audioEpisode.routes.js': 'User Audio Episodes',
    'user/audioProgress.routes.js': 'User Audio Progress'
  };

  return mapping[file] || file;
}

// Human readable request name
function getRequestName(method, endpoint) {
  const parts = endpoint.split('/').filter(Boolean);
  const cleanParts = parts.filter(p => p !== 'api' && p !== 'v1' && p !== 'app');
  const formattedParts = cleanParts.map(p => {
    if (p.startsWith(':')) return `{${p.slice(1)}}`;
    return p.charAt(0).toUpperCase() + p.slice(1);
  });
  return `${method} ${formattedParts.join(' ')}`;
}

// Extract path variables
function parseUrlPath(endpoint) {
  const pathSegments = endpoint.split('/').filter(Boolean);
  const pathVars = [];
  
  const formattedSegments = pathSegments.map(segment => {
    if (segment.startsWith(':')) {
      const varName = segment.slice(1);
      pathVars.push({
        key: varName,
        value: "6a969ccd85693b76328deb23",
        description: `Path parameter: ${varName}`
      });
      return `:${varName}`;
    }
    return segment;
  });

  return {
    pathSegments: formattedSegments,
    pathVars
  };
}

// Sample request bodies based on endpoint pattern
function getRequestBody(method, endpoint) {
  if (method === 'GET' || method === 'DELETE') return null;

  if (endpoint.includes('/comments')) {
    return {
      mode: 'raw',
      raw: JSON.stringify({ text: "Awesome content!", contentType: "movie" }, null, 2),
      options: { raw: { language: 'json' } }
    };
  }

  if (endpoint.includes('/auth/login')) {
    return {
      mode: 'raw',
      raw: JSON.stringify({ email: "admin@golidoli.com", password: "Password123!" }, null, 2),
      options: { raw: { language: 'json' } }
    };
  }
  if (endpoint.includes('/send-otp')) {
    return {
      mode: 'raw',
      raw: JSON.stringify({ email: "user@example.com", phone: "+919876543210" }, null, 2),
      options: { raw: { language: 'json' } }
    };
  }
  if (endpoint.includes('/verify-otp')) {
    return {
      mode: 'raw',
      raw: JSON.stringify({ email: "user@example.com", otp: "123456" }, null, 2),
      options: { raw: { language: 'json' } }
    };
  }
  if (endpoint.includes('/google-login')) {
    return {
      mode: 'raw',
      raw: JSON.stringify({ idToken: "sample_google_id_token" }, null, 2),
      options: { raw: { language: 'json' } }
    };
  }
  if (endpoint.includes('/complete-profile') || endpoint.includes('/update-profile')) {
    return {
      mode: 'raw',
      raw: JSON.stringify({ name: "John Doe", avatar: "https://cdn.golidoli.com/avatar.jpg" }, null, 2),
      options: { raw: { language: 'json' } }
    };
  }
  if (endpoint.includes('/fcm-token')) {
    return {
      mode: 'raw',
      raw: JSON.stringify({ fcmToken: "sample_fcm_token_string" }, null, 2),
      options: { raw: { language: 'json' } }
    };
  }
  if (endpoint.includes('/interaction/toggle')) {
    return {
      mode: 'raw',
      raw: JSON.stringify({ contentId: "60f7a1b2c3d4e5f6a7b8c9d0", targetType: "movie", action: "like" }, null, 2),
      options: { raw: { language: 'json' } }
    };
  }
  if (endpoint.includes('/rating/rate')) {
    return {
      mode: 'raw',
      raw: JSON.stringify({ contentId: "60f7a1b2c3d4e5f6a7b8c9d0", contentType: "movie", rating: 5, review: "Great content!" }, null, 2),
      options: { raw: { language: 'json' } }
    };
  }
  if (endpoint.includes('/watchlist')) {
    return {
      mode: 'raw',
      raw: JSON.stringify({ contentId: "60f7a1b2c3d4e5f6a7b8c9d0", contentType: "movie" }, null, 2),
      options: { raw: { language: 'json' } }
    };
  }
  if (endpoint.includes('/movies/add') || endpoint.includes('/series/add') || endpoint.includes('/shortdramas/add')) {
    return {
      mode: 'raw',
      raw: JSON.stringify({
        title: "Sample Title",
        description: "Comprehensive description of the video content",
        genres: ["Action", "Drama"],
        releaseYear: 2026,
        thumbnail: "https://cdn.golidoli.com/thumb.jpg",
        banner: "https://cdn.golidoli.com/banner.jpg",
        isPremium: false,
        is18Plus: false
      }, null, 2),
      options: { raw: { language: 'json' } }
    };
  }

  return {
    mode: 'raw',
    raw: JSON.stringify({}, null, 2),
    options: { raw: { language: 'json' } }
  };
}

const foldersMap = new Map();

allEndpoints.forEach(item => {
  const folderName = getFolderName(item.file);
  if (!foldersMap.has(folderName)) {
    foldersMap.set(folderName, []);
  }

  const { pathSegments, pathVars } = parseUrlPath(item.endpoint);
  const reqBody = getRequestBody(item.method, item.endpoint);

  const requestObj = {
    name: getRequestName(item.method, item.endpoint),
    request: {
      method: item.method,
      header: [
        {
          key: "Content-Type",
          value: "application/json",
          type: "text"
        },
        {
          key: "Authorization",
          value: "Bearer {{token}}",
          type: "text",
          description: "Bearer token for authenticated user/admin"
        }
      ],
      url: {
        raw: `{{baseUrl}}${item.endpoint}`,
        host: ["{{baseUrl}}"],
        path: pathSegments,
        variable: pathVars
      }
    },
    response: []
  };

  if (reqBody) {
    requestObj.request.body = reqBody;
  }

  foldersMap.get(folderName).push(requestObj);
});

const collectionItems = [];
foldersMap.forEach((requests, folderName) => {
  collectionItems.push({
    name: folderName,
    item: requests
  });
});

const collection = {
  info: {
    _postman_id: "golidoli-ott-api-collection-v1",
    name: "GoliDoli OTT API Collection",
    description: "Official Postman v2.1 Collection for GoliDoli OTT Platform APIs covering all Admin & User endpoints.",
    schema: "https://schema.getpostman.com/json/collection/v2.1.0/collection.json"
  },
  variable: [
    {
      key: "baseUrl",
      value: "http://localhost:5000",
      type: "string",
      description: "Base server URL for GoliDoli OTT Backend API"
    },
    {
      key: "token",
      value: "",
      type: "string",
      description: "Bearer JWT authentication token"
    }
  ],
  item: collectionItems
};

fs.writeFileSync(outputPath, JSON.stringify(collection, null, 2), 'utf8');
console.log(`Successfully generated Postman Collection at: ${outputPath}`);
