/**
 * Parse structured Markdown into a content model
 */
export function parseNoticeMarkdown(markdown) {
  const lines = markdown.split('\n');
  
  let title = '';
  let intro = '';
  const sections = [];
  
  let currentSection = null;
  let currentCard = null;
  let cardBodyLines = [];
  
  let state = 'start'; // 'start', 'after-title', 'in-section', 'in-card'
  
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    const trimmed = line.trim();
    
    // Parse # (title) only once at the beginning
    if (trimmed.startsWith('# ') && state === 'start') {
      title = trimmed.slice(2).trim();
      state = 'after-title';
      continue;
    }
    
    // Parse ## (section) - only if it fully matches the pattern
    const sectionMatch = trimmed.match(/^## \[([^\]]+)\]\s+(.+)$/);
    if (sectionMatch) {
      // Save previous card if any
      if (currentCard) {
        currentCard.bodyMarkdown = cardBodyLines.join('\n');
        cardBodyLines = [];
      }
      
      // Save previous section if any
      if (currentSection) {
        sections.push(currentSection);
      }
      
      currentSection = {
        id: sectionMatch[1],
        title: sectionMatch[2],
        intro: '',
        cards: []
      };
      currentCard = null;
      state = 'in-section';
      continue;
    }
    
    // Parse ### (card) - only if it fully matches the pattern
    const cardMatch = trimmed.match(/^### \[([^\]]+)\]\s+(.+)$/);
    if (cardMatch && currentSection) {
      // Save previous card if any
      if (currentCard) {
        currentCard.bodyMarkdown = cardBodyLines.join('\n');
        cardBodyLines = [];
      }
      
      currentCard = {
        id: cardMatch[1],
        title: cardMatch[2],
        bodyMarkdown: ''
      };
      currentSection.cards.push(currentCard);
      state = 'in-card';
      continue;
    }
    
    // Accumulate content based on state (malformed heading-like lines stay as body text).
    // Interior blank lines are preserved so adjacent markdown blocks (e.g. two
    // blockquotes) stay separate; leading blanks are skipped.
    if (state === 'after-title' && !currentSection && (intro || trimmed)) {
      intro += (intro ? '\n' : '') + trimmed;
    } else if (state === 'in-section' && !currentCard && (currentSection.intro || trimmed)) {
      currentSection.intro += (currentSection.intro ? '\n' : '') + trimmed;
    } else if (state === 'in-card' && currentCard) {
      cardBodyLines.push(line);
    } else if ((state === 'in-section' || state === 'in-card') && trimmed) {
      // Malformed heading-like lines (##, ###, etc. without proper format) stay as content
      if (state === 'in-card' && currentCard) {
        cardBodyLines.push(line);
      }
    }
  }
  
  // Save last card if any
  if (currentCard) {
    currentCard.bodyMarkdown = cardBodyLines.join('\n');
  }
  
  // Save last section if any
  if (currentSection) {
    sections.push(currentSection);
  }

  for (const section of sections) {
    section.intro = section.intro.trimEnd();
  }

  return {
    title,
    intro: intro.trimEnd(),
    sections
  };
}

/**
 * Merge translations from secondary model into primary model
 */
export function mergeTranslations(primaryModel, secondaryModel) {
  // Create a map of secondary sections by id for fast lookup
  const secondarySectionsMap = new Map();
  secondaryModel.sections.forEach(section => {
    const cardsMap = new Map();
    section.cards.forEach(card => {
      cardsMap.set(card.id, card);
    });
    secondarySectionsMap.set(section.id, { section, cardsMap });
  });
  
  // Process primary sections
  const mergedSections = primaryModel.sections.map(section => {
    const mergedSection = { ...section };
    
    // Find matching section in secondary model
    const secondaryData = secondarySectionsMap.get(section.id);
    if (secondaryData) {
      mergedSection.translation = {
        title: secondaryData.section.title,
        intro: secondaryData.section.intro
      };
      
      // Process cards
      mergedSection.cards = section.cards.map(card => {
        const mergedCard = { ...card };
        
        // Find matching card in secondary section
        const secondaryCard = secondaryData.cardsMap.get(card.id);
        if (secondaryCard) {
          mergedCard.translation = {
            title: secondaryCard.title,
            bodyMarkdown: secondaryCard.bodyMarkdown
          };
        } else {
          mergedCard.translation = null;
        }
        
        return mergedCard;
      });
    } else {
      mergedSection.translation = null;
      // Cards also need translation = null
      mergedSection.cards = section.cards.map(card => ({
        ...card,
        translation: null
      }));
    }
    
    return mergedSection;
  });
  
  return {
    ...primaryModel,
    sections: mergedSections,
    translation: {
      title: secondaryModel.title,
      intro: secondaryModel.intro
    }
  };
}
