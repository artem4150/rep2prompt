import { ApiError } from './api';
import { Language } from './types';

const friendlyMessages: Record<Language, Record<string, string>> = {
  en: {
    rate_limited: 'GitHub rate limit reached. Please retry in a few minutes.',
    github_rate_limited: 'GitHub rate limit reached. Please retry in a few minutes.',
    github_upstream_error: 'GitHub returned a server error. Please retry later.',
    github_not_found: 'Repository or ref not found. Check the repository URL and branch.',
    github_network_error: 'Network error while downloading the repository. Please retry.',
    tarball_read_error: 'Network error while downloading the repository. Please retry.',
    tarball_write_error: 'Failed to store the downloaded repository. Please retry.',
    temp_file_create_failed: 'Failed to create a temporary file for the download.',
    temp_file_seek_failed: 'Temporary file handling failed.',
    artifact_write_failed: 'Failed to create the export artifact.',
    artifact_finalize_failed: 'Failed to finalize the export artifact.',
    zip_build_failed: 'Failed to assemble the ZIP archive. Please retry.',
    txt_build_failed: 'Failed to assemble the text export. Please retry.',
    promptpack_build_failed: 'Failed to generate the prompt pack. Please retry.',
    promptpack_second_pass_tarball: 'Unable to download the repository for the prompt pack. Please retry later.',
    promptpack_second_pass_failed: 'Prompt pack generation failed on the second pass. Please retry.',
    too_large: 'Export exceeds the size limit. Narrow the selection or adjust filters.',
    unknown_format: 'Unknown export format.',
    invalid_payload: 'Internal exporter error.',
    user_cancelled: 'Export was cancelled.',
    context_cancelled: 'Export was cancelled by the system.',
    not_found: 'Resource not found.',
    network: 'Network error. Check your connection and retry.',
    timeout: 'Request timed out. Please retry.',
    conflict: 'Job has already finished.',
  },
  ru: {
    rate_limited: 'Достигнут лимит GitHub. Повторите попытку через несколько минут.',
    github_rate_limited: 'Достигнут лимит GitHub. Повторите попытку через несколько минут.',
    github_upstream_error: 'GitHub вернул ошибку сервера. Попробуйте позже.',
    github_not_found: 'Репозиторий или ветка не найдены. Проверьте URL и ветку.',
    github_network_error: 'Сетевая ошибка при скачивании репозитория. Повторите попытку.',
    tarball_read_error: 'Сетевая ошибка при скачивании репозитория. Повторите попытку.',
    tarball_write_error: 'Не удалось сохранить скачанный архив. Повторите попытку.',
    temp_file_create_failed: 'Не удалось создать временный файл для скачивания.',
    temp_file_seek_failed: 'Ошибка работы с временным файлом.',
    artifact_write_failed: 'Не удалось создать файл экспорта.',
    artifact_finalize_failed: 'Не удалось завершить запись файла экспорта.',
    zip_build_failed: 'Не удалось собрать ZIP-архив. Повторите попытку.',
    txt_build_failed: 'Не удалось собрать текстовый экспорт. Повторите попытку.',
    promptpack_build_failed: 'Не удалось собрать prompt pack. Повторите попытку.',
    promptpack_second_pass_tarball: 'Не удалось повторно скачать репозиторий для prompt pack. Попробуйте позже.',
    promptpack_second_pass_failed: 'Сбой на втором проходе генерации prompt pack. Повторите попытку.',
    too_large: 'Экспорт превышает лимит размера. Сузьте выбор или измените фильтры.',
    unknown_format: 'Неизвестный формат экспорта.',
    invalid_payload: 'Внутренняя ошибка экспортера.',
    user_cancelled: 'Экспорт отменён пользователем.',
    context_cancelled: 'Экспорт отменён системой.',
    not_found: 'Ресурс не найден.',
    network: 'Сетевая ошибка. Проверьте соединение и повторите попытку.',
    timeout: 'Истек таймаут запроса. Повторите попытку.',
    conflict: 'Задача уже завершена.',
  },
};

const defaultFailureMessage: Record<Language, string> = {
  en: 'Export failed. Please retry later.',
  ru: 'Экспорт завершился ошибкой. Попробуйте ещё раз позже.',
};

export const getFriendlyMessage = (code: string | null | undefined, language: Language): string | null => {
  if (!code) {
    return null;
  }
  const dict = friendlyMessages[language] ?? friendlyMessages.en;
  return dict[code] ?? null;
};

export const getFriendlyApiError = (error: ApiError, language: Language): string => {
  const friendly = getFriendlyMessage(error.code, language);
  if (friendly) {
    return friendly;
  }
  return error.message ?? (language === 'ru' ? 'Не удалось выполнить запрос.' : 'Request failed.');
};

export const getFriendlyFailureReason = (reason: string | null | undefined, language: Language): string | null => {
  if (!reason) {
    return null;
  }
  return getFriendlyMessage(reason, language) ?? defaultFailureMessage[language];
};
